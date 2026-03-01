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
    grayBase:  "#52525b",  // zinc-600 — genera escala de grises fría
    success:   "#22c55e",
    warning:   "#f87171",
  },
  layout: {
    borderRadius: { base: "0.5rem" },
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
    grayBase:  "#6b7280",  // gray-500 — gris neutro
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
