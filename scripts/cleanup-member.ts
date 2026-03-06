import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const EMAIL = "nancyathziri2024@outlook.com";

async function main() {
  const user = await db.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.log(`User ${EMAIL} not found`);
    return;
  }
  console.log(`\nUser: ${user.name} (${user.email}) — id: ${user.id}\n`);

  const tenantUsers = await db.tenantUser.findMany({
    where: { userId: user.id },
    include: { tenant: { select: { name: true, subdomain: true } } },
  });

  for (const tu of tenantUsers) {
    console.log(`Tenant: ${tu.tenant.name} (${tu.tenant.subdomain}) — tenantUserId: ${tu.id}`);

    const subs = await db.memberSubscription.findMany({
      where: { tenantUserId: tu.id },
      include: {
        plan: { select: { name: true } },
        price: { select: { amountCents: true, interval: true, intervalCount: true } },
        invoices: {
          include: {
            payments: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (subs.length === 0) {
      console.log("  No subscriptions found\n");
      continue;
    }

    for (const sub of subs) {
      console.log(`\n  Subscription: ${sub.id}`);
      console.log(`    Plan: ${sub.plan.name}`);
      console.log(`    Status: ${sub.status}`);
      console.log(`    Price: $${sub.price.amountCents / 100} / ${sub.price.intervalCount} ${sub.price.interval}`);
      console.log(`    BillingEndsAt: ${sub.billingEndsAt.toISOString()}`);
      console.log(`    Created: ${sub.createdAt.toISOString()}`);
      if (sub.canceledAt) console.log(`    CanceledAt: ${sub.canceledAt.toISOString()}`);

      if (sub.invoices.length > 0) {
        console.log(`    Invoices (${sub.invoices.length}):`);
        for (const inv of sub.invoices) {
          console.log(`      - ${inv.id} | $${inv.amountCents / 100} | status: ${inv.status} | due: ${inv.dueAt?.toISOString() ?? "N/A"}`);
          for (const pay of inv.payments) {
            console.log(`        Payment: ${pay.id} | $${pay.amountCents / 100} | method: ${pay.method} | date: ${pay.paidAt.toISOString()}`);
          }
        }
      }
    }
    console.log("");
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
