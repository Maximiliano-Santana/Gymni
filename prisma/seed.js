// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const db = new PrismaClient();

const theme = {
  version: "1.0.0",
  metadata: {
    name: "Dev Gym",
    description: "Tema carbón y morado",
  },
  colors: {
    primary: "#7c3aed",       // morado vivo (violet-600)
    secondary: "#a78bfa",     // morado claro (violet-400)
    accent: "#6d28d9",        // morado profundo (violet-700)
    success: "#22c55e",
    warning: "#f87171",
    background: {
      primary: "#18181b",     // carbón oscuro (zinc-900)
      secondary: "#52525b",   // base para escala de grises (zinc-600)
      card: "#27272a",        // carbón medio (zinc-800)
    },
    text: {
      primary: "#fafafa",     // blanco suave (zinc-50)
      secondary: "#a1a1aa",   // gris claro (zinc-400)
      muted: "#71717a",       // gris apagado (zinc-500)
    },
    border: {
      default: "#3f3f46",     // zinc-700
      focus: "#a78bfa",       // morado claro para focus rings
    },
  },
  layout: {
    borderRadius: { base: "0.5rem" },
  },
};

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.log("⛔ Seed bloqueado en producción.");
    return;
  }
  const tenant = await db.tenant.upsert({
    where: { subdomain: "dev-gym" },
    update: { name: "Dev Gym", address: "michiland", settings: theme },
    create: {
      name: "Dev Gym",
      address: "michiland",
      subdomain: "dev-gym",
      settings: theme,
    },
  });
  console.log("✅ Seed OK:", { id: tenant.id, subdomain: tenant.subdomain });

  // Usuario OWNER para dev-gym
  // Credenciales: admin@gmail.com / tashamaria123*d
  const hashedPassword = await bcrypt.hash("tashamaria123*d", 10);
  const owner = await db.user.upsert({
    where: { email: "admin@gmail.com" },
    update: { password: hashedPassword },
    create: {
      name: "Admin Dev",
      email: "admin@gmail.com",
      password: hashedPassword,
    },
  });
  await db.tenantUser.upsert({
    where: { userId_tenantId: { userId: owner.id, tenantId: tenant.id } },
    update: {},
    create: { userId: owner.id, tenantId: tenant.id, roles: ["OWNER"] },
  });
  console.log("✅ Seed OK: usuario OWNER creado →", owner.email);

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
  console.log("✅ Seed OK:", { id: plan.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
