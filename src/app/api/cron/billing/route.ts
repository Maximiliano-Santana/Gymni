import db from "@/lib/prisma";
import { getTenantSettings } from "@/features/tenants/types/settings";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

export async function POST(request: Request) {
  if ((await headers()).get("x-cron-key") !== process.env.CRON_KEY)
    return NextResponse.json({ message: "Cron key inválida" }, { status: 401 });

  const now = new Date();

  // ─── Platform billing (Gymni → Tenant) ───
  const platformStats = await processPlatformBilling(now);

  // ─── Member billing (Tenant → Member) ───
  const memberStats = await processMemberBilling(now);

  return NextResponse.json(
    { message: "Cron executed", platform: platformStats, member: memberStats },
    { status: 200 }
  );
}

// ─── Platform billing (unchanged logic) ───

async function processPlatformBilling(now: Date) {
  const endedSubscriptions = await db.subscription.findMany({
    where: { status: "active", currentPeriodEnd: { lte: now } },
    select: {
      id: true,
      tenantId: true,
      billingInterval: true,
      currentPeriodEnd: true,
      priceId: true,
      price: {
        select: {
          id: true,
          planId: true,
          interval: true,
          amountCents: true,
          currency: true,
        },
      },
      invoices: { where: { status: "open" } },
    },
    take: 500,
  });

  const stats = {
    processedSubs: endedSubscriptions.length,
    createdInvoices: 0,
    canceledSubs: 0,
    overdueAlerts: 0,
    createdInvoiceIds: [] as string[],
    canceledSubIds: [] as string[],
  };

  for (const subscription of endedSubscriptions) {
    if (!subscription.invoices[0]) {
      const trialDays = 0;
      const graceDays = 3;

      const trialEnd = trialDays > 0 ? addDays(now, trialDays) : now;
      const periodStart = trialEnd;
      const currentPeriodEnd = new Date(periodStart);
      if (subscription.price.interval === "MONTH") {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      } else {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      }

      const invoiceDueAt = addDays(periodStart, graceDays);

      const invoice = await db.invoice.create({
        data: {
          tenantId: subscription.tenantId,
          subscriptionId: subscription.id,
          amountCents: subscription.price.amountCents,
          currency: subscription.price.currency,
          status: "open",
          issuedAt: now,
          dueAt: invoiceDueAt,
          planId: subscription.price.planId,
          priceId: subscription.price.id,
        },
        select: { id: true },
      });

      stats.createdInvoices += 1;
      stats.createdInvoiceIds.push(invoice.id);
    } else if (
      subscription.invoices[0].dueAt &&
      subscription.invoices[0].dueAt < now
    ) {
      stats.overdueAlerts += 1;
    } else if (
      subscription.invoices[0].dueAt &&
      subscription.invoices[0].dueAt > now
    ) {
      const updatedSubscription = await db.subscription.update({
        where: { id: subscription.id },
        data: { status: "canceled", canceledAt: now },
        select: { id: true },
      });
      stats.canceledSubs += 1;
      stats.canceledSubIds.push(updatedSubscription.id);
    }
  }

  return stats;
}

// ─── Member billing (Tenant → Member) ───

function computeNextBillingEnd(
  current: Date,
  interval: "MONTH" | "YEAR",
  intervalCount: number
): Date {
  const next = new Date(current);
  if (interval === "MONTH") {
    next.setMonth(next.getMonth() + intervalCount);
  } else {
    next.setFullYear(next.getFullYear() + intervalCount);
  }
  return next;
}

async function processMemberBilling(now: Date) {
  const stats = {
    renewals: 0,
    pastDue: 0,
    canceled: 0,
  };

  // Fetch all ACTIVE subs past their billingEndsAt, and PAST_DUE subs
  const subs = await db.memberSubscription.findMany({
    where: {
      OR: [
        { status: "ACTIVE", billingEndsAt: { lte: now } },
        { status: "PAST_DUE" },
      ],
    },
    include: {
      tenant: { select: { id: true, settings: true } },
      price: {
        select: {
          id: true,
          planId: true,
          interval: true,
          intervalCount: true,
          amountCents: true,
          currency: true,
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, dueAt: true },
      },
    },
    take: 500,
  });

  for (const sub of subs) {
    const tenantSettings = getTenantSettings(sub.tenant);
    const graceDays = tenantSettings?.billing?.graceDays ?? 0;
    const autoCancelDays = tenantSettings?.billing?.autoCancelDays ?? 0;

    const lastInvoice = sub.invoices[0] ?? null;

    if (sub.status === "ACTIVE") {
      // Case A: Auto-renew — last invoice is paid
      if (lastInvoice?.status === "paid") {
        const newBillingEnd = computeNextBillingEnd(
          sub.billingEndsAt,
          sub.price.interval,
          sub.price.intervalCount
        );

        await db.$transaction([
          db.memberSubscription.update({
            where: { id: sub.id },
            data: { billingEndsAt: newBillingEnd },
          }),
          db.memberInvoice.create({
            data: {
              tenantId: sub.tenantId,
              subscriptionId: sub.id,
              amountCents: sub.price.amountCents,
              currency: sub.price.currency,
              status: "open",
              issuedAt: now,
              // dueAt = real deadline (start of period + grace days)
              dueAt: addDays(sub.billingEndsAt, graceDays),
              planId: sub.price.planId,
              priceId: sub.price.id,
            },
          }),
        ]);

        stats.renewals += 1;
        continue;
      }

      // Case B: Mark PAST_DUE — invoice dueAt has passed (grace already baked in)
      if (
        lastInvoice?.status === "open" &&
        lastInvoice.dueAt &&
        lastInvoice.dueAt <= now
      ) {
        await db.memberSubscription.update({
          where: { id: sub.id },
          data: { status: "PAST_DUE" },
        });
        stats.pastDue += 1;
      }
    } else if (sub.status === "PAST_DUE") {
      // Case C: Auto-cancel — invoice dueAt + autoCancelDays has passed (grace already in dueAt)
      if (
        autoCancelDays > 0 &&
        lastInvoice?.dueAt &&
        addDays(lastInvoice.dueAt, autoCancelDays) <= now
      ) {
        const updates = [
          db.memberSubscription.update({
            where: { id: sub.id },
            data: { status: "CANCELED", canceledAt: now },
          }),
        ];
        if (lastInvoice.status === "open") {
          updates.push(
            db.memberInvoice.update({
              where: { id: lastInvoice.id },
              data: { status: "void" },
            }) as never
          );
        }
        await db.$transaction(updates);
        stats.canceled += 1;
      }
    }
  }

  return stats;
}
