import db from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if ((await headers()).get("x-cron-key") !== process.env.CRON_KEY)
    return NextResponse.json({ message: "Cron key inválida" }, { status: 401 });

  const now = new Date();

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

  // --- métricas de ejecución ---
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
      const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
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
      // pendiente de pago (overdue) -> solo contamos alerta
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

  return NextResponse.json(
    {
      message: "Cron executed",
      ...stats,
    },
    { status: 200 }
  );
}
