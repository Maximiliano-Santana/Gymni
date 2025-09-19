// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const theme = {
  version: "1.0.0",
  metadata: { name: "Gymni Default Theme", createdAt: "2025-09-19T00:00:00.000Z", updatedAt: "2025-09-19T00:00:00.000Z" },
  colors: {
    primary: "#2563eb", secondary: "#1e293b", accent: "#f59e0b",
    success: "#22c55e", warning: "#ef4444",
    background: { primary: "#0f172a", secondary: "#1e293b", card: "#111827" },
    text: { primary: "#f9fafb", secondary: "#cbd5e1", muted: "#94a3b8" },
    border: { default: "#334155", focus: "#2563eb" }
  }
};

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.log("⛔ Seed bloqueado en producción."); return;
  }
  const tenant = await db.tenant.upsert({
    where: { subdomain: "dev-gym" },
    update: { name: "Dev Gym", address: "michiland", settings: theme },
    create: { name: "Dev Gym", address: "michiland", subdomain: "dev-gym", settings: theme }
  });
  console.log("✅ Seed OK:", { id: tenant.id, subdomain: tenant.subdomain });
}

main().catch((e) => { console.error(e); process.exit(1); })
       .finally(async () => { await db.$disconnect(); });
