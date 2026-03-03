import { PrismaClient } from "@prisma/client";
import * as readline from "readline";

const db = new PrismaClient();

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("\n🏋️ Crear nuevo gym\n");

  const name = await ask("Nombre del gym: ");
  if (!name) { console.log("Nombre obligatorio"); return; }

  const subdomain = await ask("Subdomain (ej: iron-gym): ");
  if (!subdomain || !/^[a-z0-9-]+$/.test(subdomain)) {
    console.log("Subdomain inválido. Solo minúsculas, números y guiones.");
    return;
  }

  const address = await ask("Dirección: ");

  const ownerEmail = await ask("Email del owner: ");
  if (!ownerEmail || !ownerEmail.includes("@")) {
    console.log("Email inválido");
    return;
  }

  // Check if subdomain is taken
  const existing = await db.tenant.findUnique({ where: { subdomain } });
  if (existing) {
    console.log(`\n❌ El subdomain "${subdomain}" ya existe.`);
    return;
  }

  // Create tenant with default settings
  const tenant = await db.tenant.create({
    data: {
      name,
      subdomain,
      address: address || "",
      settings: {
        version: "1.0.0",
        mode: "light",
        colors: {
          primary: "#f97316",
          secondary: "#6366f1",
          grayBase: "#6b7280",
          success: "#22c55e",
          warning: "#f87171",
        },
        layout: { borderRadius: { base: "0.5rem" } },
      },
    },
  });

  console.log(`\n✅ Gym creado: ${tenant.name} (${tenant.subdomain})`);

  // Check if owner already has an account
  const user = await db.user.findUnique({ where: { email: ownerEmail } });

  if (user) {
    // User exists — create TenantUser directly
    const existingTu = await db.tenantUser.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    });

    if (!existingTu) {
      await db.tenantUser.create({
        data: { userId: user.id, tenantId: tenant.id, roles: ["OWNER"] },
      });
    }

    console.log(`✅ ${ownerEmail} ya tenía cuenta — asignado como OWNER`);
    console.log(`\n🔗 Ya puede entrar a: https://${subdomain}.gymni.app/admin`);
  } else {
    // User doesn't exist — create invitation
    const invitation = await db.invitation.create({
      data: {
        email: ownerEmail,
        tenantId: tenant.id,
        role: "OWNER",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
      },
    });

    console.log(`✅ Invitación creada para ${ownerEmail}`);
    console.log(`\n🔗 Envía este link al owner:\n`);
    console.log(`   https://${subdomain}.gymni.app/register?invitation=${invitation.id}`);
  }

  console.log("");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
