// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const db = new PrismaClient();

// ── Themes ───────────────────────────────────────────────────────────────────

const devGymTheme = {
  version: "1.0.0",
  mode: "dark",
  metadata: {
    name: "Dev Gym",
    description: "Tema carbón y morado",
  },
  colors: {
    primary:   "#7c3aed",  // violet-600
    secondary: "#a78bfa",  // violet-400
    grayBase:  "#5c4a7c",  // gris tintado morado
    success:   "#22c55e",
    warning:   "#f87171",
  },
  layout: {
    borderRadius: { base: "0.5rem" },
  },
  billing: {
    graceDays: 3,
    autoCancelDays: 30,
  },
};

const greenGymTheme = {
  version: "1.0.0",
  mode: "light",
  metadata: {
    name: "Green Gym",
    description: "Tema claro con verde",
  },
  colors: {
    primary:   "#16a34a",  // green-600
    secondary: "#0d9488",  // teal-600 — complementa al verde
    grayBase:  "#4a7c6b",  // gris tintado verde-azulado
    success:   "#22c55e",
    warning:   "#f87171",
  },
  layout: {
    borderRadius: { base: "0.625rem" },
  },
};

// ── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.log("⛔ Seed bloqueado en producción.");
    return;
  }

  const hashedPassword = await bcrypt.hash("tashamaria123*d", 10);

  // ── Dev Gym (dark + morado) ────────────────────────────────────────────
  const devGym = await db.tenant.upsert({
    where: { subdomain: "dev-gym" },
    update: { name: "Dev Gym", address: "michiland", settings: devGymTheme },
    create: {
      name: "Dev Gym",
      address: "michiland",
      subdomain: "dev-gym",
      settings: devGymTheme,
    },
  });
  console.log("✅ Tenant:", { id: devGym.id, subdomain: devGym.subdomain });

  const devOwner = await db.user.upsert({
    where: { email: "admin@gmail.com" },
    update: { password: hashedPassword },
    create: {
      name: "Admin Dev",
      email: "admin@gmail.com",
      password: hashedPassword,
    },
  });
  await db.tenantUser.upsert({
    where: { userId_tenantId: { userId: devOwner.id, tenantId: devGym.id } },
    update: {},
    create: { userId: devOwner.id, tenantId: devGym.id, roles: ["OWNER"] },
  });
  console.log("✅ Owner dev-gym:", devOwner.email);

  // ── Green Gym (light + verde) ──────────────────────────────────────────
  const greenGym = await db.tenant.upsert({
    where: { subdomain: "green-gym" },
    update: { name: "Green Gym", address: "ecoland", settings: greenGymTheme },
    create: {
      name: "Green Gym",
      address: "ecoland",
      subdomain: "green-gym",
      settings: greenGymTheme,
    },
  });
  console.log("✅ Tenant:", { id: greenGym.id, subdomain: greenGym.subdomain });

  const greenOwner = await db.user.upsert({
    where: { email: "green@gmail.com" },
    update: { password: hashedPassword },
    create: {
      name: "Admin Green",
      email: "green@gmail.com",
      password: hashedPassword,
    },
  });
  await db.tenantUser.upsert({
    where: { userId_tenantId: { userId: greenOwner.id, tenantId: greenGym.id } },
    update: {},
    create: { userId: greenOwner.id, tenantId: greenGym.id, roles: ["OWNER"] },
  });
  console.log("✅ Owner green-gym:", greenOwner.email);

  // ── Plan BASIC ─────────────────────────────────────────────────────────
  const plan = await db.plan.upsert({
    where: { code: "BASIC" },
    update: {
      name: "Basic",
      limits: { membersActiveMax: 400 },
      isActive: true,
    },
    create: {
      code: "BASIC",
      name: "Basic",
      limits: { membersActiveMax: 400 },
      isActive: true,
    },
  });

  await db.planPrice.deleteMany({ where: { planId: plan.id } });

  await db.planPrice.createMany({
    data: [
      {
        planId: plan.id,
        interval: "MONTH",
        amountCents: 99900,
        currency: "MXN",
      }, // $999.00 MXN
      {
        planId: plan.id,
        interval: "YEAR",
        amountCents: 999900,
        currency: "MXN",
      }, // $9,999.00 MXN
    ],
    skipDuplicates: true,
  });
  console.log("✅ Plan:", plan.name);

  // ── Membership Plans for dev-gym ──────────────────────────────────────
  await db.memberPayment.deleteMany({ where: { tenantId: devGym.id } });
  await db.memberInvoice.deleteMany({ where: { tenantId: devGym.id } });
  await db.memberSubscription.deleteMany({ where: { tenantId: devGym.id } });
  await db.membershipPrice.deleteMany({
    where: { plan: { tenantId: devGym.id } },
  });
  await db.membershipPlan.deleteMany({ where: { tenantId: devGym.id } });

  const basicPlan = await db.membershipPlan.create({
    data: {
      tenantId: devGym.id,
      code: "BASICO",
      name: "Básico",
      description: "Acceso general al gimnasio",
    },
  });
  const premiumPlan = await db.membershipPlan.create({
    data: {
      tenantId: devGym.id,
      code: "PREMIUM",
      name: "Premium",
      description: "Acceso completo + clases grupales",
    },
  });

  // Precios: mensual, trimestral, anual
  const basicMonthly = await db.membershipPrice.create({
    data: {
      planId: basicPlan.id,
      interval: "MONTH",
      intervalCount: 1,
      amountCents: 49900,
      currency: "MXN",
    }, // $499 MXN
  });
  await db.membershipPrice.create({
    data: {
      planId: basicPlan.id,
      interval: "MONTH",
      intervalCount: 3,
      amountCents: 129900,
      currency: "MXN",
    }, // $1,299 MXN trimestral
  });
  await db.membershipPrice.create({
    data: {
      planId: basicPlan.id,
      interval: "YEAR",
      intervalCount: 1,
      amountCents: 449900,
      currency: "MXN",
    }, // $4,499 MXN anual
  });

  const premiumMonthly = await db.membershipPrice.create({
    data: {
      planId: premiumPlan.id,
      interval: "MONTH",
      intervalCount: 1,
      amountCents: 79900,
      currency: "MXN",
    }, // $799 MXN
  });
  await db.membershipPrice.create({
    data: {
      planId: premiumPlan.id,
      interval: "MONTH",
      intervalCount: 3,
      amountCents: 209900,
      currency: "MXN",
    }, // $2,099 MXN trimestral
  });
  await db.membershipPrice.create({
    data: {
      planId: premiumPlan.id,
      interval: "YEAR",
      intervalCount: 1,
      amountCents: 749900,
      currency: "MXN",
    }, // $7,499 MXN anual
  });
  console.log("✅ Membership Plans:", basicPlan.name, premiumPlan.name);

  // ── Sample Members for dev-gym ────────────────────────────────────────
  const memberEmails = [
    { name: "Carlos López", email: "carlos@test.com" },
    { name: "María García", email: "maria@test.com" },
    { name: "Juan Rodríguez", email: "juan@test.com" },
    { name: "Ana Martínez", email: "ana@test.com" },
    { name: "Pedro Sánchez", email: "pedro@test.com" },
  ];

  const members = [];
  for (const m of memberEmails) {
    const user = await db.user.upsert({
      where: { email: m.email },
      update: { password: hashedPassword },
      create: { name: m.name, email: m.email, password: hashedPassword },
    });
    const tu = await db.tenantUser.upsert({
      where: {
        userId_tenantId: { userId: user.id, tenantId: devGym.id },
      },
      update: {},
      create: {
        userId: user.id,
        tenantId: devGym.id,
        roles: ["MEMBER"],
      },
    });
    members.push(tu);
  }
  console.log("✅ Members:", members.length);

  // ── Sample Subscriptions + Invoices + Payments ────────────────────────
  //
  // Escenarios de billing para testear con el cron:
  //   Carlos → ACTIVE, pagado, no vencido      → cron no hace nada (sano)
  //   María  → ACTIVE, pagado, ya venció        → cron auto-renueva
  //   Juan   → ACTIVE, open invoice, ya venció  → cron marca PAST_DUE
  //   Ana    → PAST_DUE, open invoice vieja     → cron auto-cancela
  //   Pedro  → sin suscripción                  → warning en check-in
  //
  const now = new Date();
  const addDays = (d, n) => new Date(d.getTime() + n * 86_400_000);

  const inOneMonth = new Date(now);
  inOneMonth.setMonth(inOneMonth.getMonth() + 1);
  const yesterday = addDays(now, -1);
  const fiveDaysAgo = addDays(now, -5);
  const fortyDaysAgo = addDays(now, -40);
  const twoMonthsAgo = addDays(now, -60);

  // ── Carlos: Básico — ACTIVE, pagado, vence en 1 mes (sano, cron no toca) ──
  const sub1 = await db.memberSubscription.create({
    data: {
      tenantId: devGym.id,
      tenantUserId: members[0].id,
      planId: basicPlan.id,
      priceId: basicMonthly.id,
      status: "ACTIVE",
      billingEndsAt: inOneMonth,
    },
  });
  const inv1 = await db.memberInvoice.create({
    data: {
      tenantId: devGym.id,
      subscriptionId: sub1.id,
      amountCents: 49900,
      currency: "MXN",
      status: "paid",
      issuedAt: now,
      dueAt: now,
      planId: basicPlan.id,
      priceId: basicMonthly.id,
    },
  });
  await db.memberPayment.create({
    data: {
      tenantId: devGym.id,
      invoiceId: inv1.id,
      method: "CASH",
      amountCents: 49900,
      paidAt: now,
      receivedBy: "Admin Dev",
    },
  });

  // ── María: Premium — ACTIVE, pagado, venció ayer → cron auto-renueva ──
  const sub2 = await db.memberSubscription.create({
    data: {
      tenantId: devGym.id,
      tenantUserId: members[1].id,
      planId: premiumPlan.id,
      priceId: premiumMonthly.id,
      status: "ACTIVE",
      billingEndsAt: yesterday,
    },
  });
  const inv2 = await db.memberInvoice.create({
    data: {
      tenantId: devGym.id,
      subscriptionId: sub2.id,
      amountCents: 79900,
      currency: "MXN",
      status: "paid",
      issuedAt: addDays(now, -30),
      dueAt: addDays(now, -30),
      planId: premiumPlan.id,
      priceId: premiumMonthly.id,
    },
  });
  await db.memberPayment.create({
    data: {
      tenantId: devGym.id,
      invoiceId: inv2.id,
      method: "TRANSFER",
      amountCents: 79900,
      paidAt: addDays(now, -30),
      reference: "TRF-001",
      receivedBy: "Admin Dev",
    },
  });

  // ── Juan: Básico — ACTIVE, invoice open, venció hace 5 días → cron marca PAST_DUE ──
  // dueAt ya incluye grace: hace 5 días + 3 grace = hace 2 días (ya pasó → PAST_DUE)
  const sub3 = await db.memberSubscription.create({
    data: {
      tenantId: devGym.id,
      tenantUserId: members[2].id,
      planId: basicPlan.id,
      priceId: basicMonthly.id,
      status: "ACTIVE",
      billingEndsAt: fiveDaysAgo,
    },
  });
  await db.memberInvoice.create({
    data: {
      tenantId: devGym.id,
      subscriptionId: sub3.id,
      amountCents: 49900,
      currency: "MXN",
      status: "open",
      issuedAt: addDays(now, -35),
      dueAt: addDays(fiveDaysAgo, 3), // inicio + graceDays = hace 2 días
      planId: basicPlan.id,
      priceId: basicMonthly.id,
    },
  });

  // ── Ana: Premium — PAST_DUE, invoice open vieja → cron auto-cancela ──
  // dueAt ya incluye grace: hace 40 días + 3 = hace 37 días. autoCancelDays=30 → 37 > 30 → cancela
  const sub4 = await db.memberSubscription.create({
    data: {
      tenantId: devGym.id,
      tenantUserId: members[3].id,
      planId: premiumPlan.id,
      priceId: premiumMonthly.id,
      status: "PAST_DUE",
      billingEndsAt: twoMonthsAgo,
    },
  });
  await db.memberInvoice.create({
    data: {
      tenantId: devGym.id,
      subscriptionId: sub4.id,
      amountCents: 79900,
      currency: "MXN",
      status: "open",
      issuedAt: twoMonthsAgo,
      dueAt: addDays(fortyDaysAgo, 3), // inicio + graceDays = hace 37 días
      planId: premiumPlan.id,
      priceId: premiumMonthly.id,
    },
  });

  // ── Pedro: sin suscripción (miembro registrado pero sin plan) ──
  console.log("✅ Subscriptions + Invoices + Payments seeded");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
