import db from "@/lib/prisma";
import { getTenantSettings } from "@/features/tenants/types/settings";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import PaymentDueEmail from "@/emails/PaymentDueEmail";
import MembershipCanceledEmail from "@/emails/MembershipCanceledEmail";

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

function isAuthorized(h: Headers): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel Cron: Authorization: Bearer <CRON_SECRET>
  // Manual/dev: curl -H "Authorization: Bearer <CRON_SECRET>" ...
  return h.get("authorization") === `Bearer ${secret}`;
}

async function runBilling() {
  const now = new Date();
  const platformStats = await processPlatformBilling(now);
  const memberStats = await processMemberBilling(now);
  return NextResponse.json(
    { message: "Cron executed", platform: platformStats, member: memberStats },
    { status: 200 }
  );
}

// Vercel Cron calls GET
export async function GET() {
  if (!isAuthorized(await headers()))
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  return runBilling();
}

// Manual/dev calls POST
export async function POST() {
  if (!isAuthorized(await headers()))
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  return runBilling();
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
        currentPeriodEnd.setUTCMonth(currentPeriodEnd.getUTCMonth() + 1);
      } else {
        currentPeriodEnd.setUTCFullYear(currentPeriodEnd.getUTCFullYear() + 1);
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

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function computeNextBillingEnd(
  current: Date,
  interval: "MONTH" | "YEAR",
  intervalCount: number
): Date {
  const next = new Date(current);
  if (interval === "MONTH") {
    next.setUTCMonth(next.getUTCMonth() + intervalCount);
  } else {
    next.setUTCFullYear(next.getUTCFullYear() + intervalCount);
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
        { status: "ACTIVE", invoices: { some: { status: "open", dueAt: { lte: now } } } },
        { status: "PAST_DUE" },
      ],
    },
    include: {
      tenant: { select: { id: true, name: true, settings: true } },
      tenantUser: {
        select: { user: { select: { email: true } } },
      },
      plan: { select: { name: true } },
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

        // Email: renewal notification
        const renewalEmail = sub.tenantUser?.user?.email;
        if (renewalEmail) {
          sendEmail({
            to: renewalEmail,
            subject: `Tu membresía en ${sub.tenant.name} se renovó`,
            react: PaymentDueEmail({
              gymName: sub.tenant.name,
              planName: sub.plan.name,
              amount: formatMoney(sub.price.amountCents, sub.price.currency),
              dueDate: formatDate(addDays(sub.billingEndsAt, graceDays)),
              isRenewal: true,
            }),
          }).catch((err) => console.error("[cron email renewal]", err));
        }

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

        // Email: past due notification
        const pastDueEmail = sub.tenantUser?.user?.email;
        if (pastDueEmail) {
          sendEmail({
            to: pastDueEmail,
            subject: `Pago pendiente en ${sub.tenant.name}`,
            react: PaymentDueEmail({
              gymName: sub.tenant.name,
              planName: sub.plan.name,
              amount: formatMoney(sub.price.amountCents, sub.price.currency),
              dueDate: lastInvoice.dueAt ? formatDate(lastInvoice.dueAt) : "",
            }),
          }).catch((err) => console.error("[cron email past_due]", err));
        }

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

        // Email: canceled notification
        const cancelEmail = sub.tenantUser?.user?.email;
        if (cancelEmail) {
          sendEmail({
            to: cancelEmail,
            subject: `Membresía cancelada en ${sub.tenant.name}`,
            react: MembershipCanceledEmail({ gymName: sub.tenant.name }),
          }).catch((err) => console.error("[cron email cancel]", err));
        }

        stats.canceled += 1;
      }
    }
  }

  return stats;
}
