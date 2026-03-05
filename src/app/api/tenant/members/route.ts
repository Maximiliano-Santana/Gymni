import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../lib/validation";
import { AddMemberSchema } from "@/features/members/types";
import type { MemberStatusFilter } from "@/features/members/types";
import { TenantRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { queryMembers } from "@/features/members/server/queries";
import { sendEmail } from "@/lib/email";
import WelcomeEmail from "@/emails/WelcomeEmail";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as MemberStatusFilter) || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    const result = await queryMembers({ tenantId, search, status, page });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al obtener miembros" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);

    const body = await request.json().catch(() => ({}));
    const parsed = AddMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: `Parámetros inválidos: ${parsed.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 }
      );
    }

    const { email, name } = parsed.data;

    // Find or create user
    let user = await db.user.findUnique({ where: { email } });
    let tempPassword: string | null = null;
    if (!user) {
      tempPassword = `Gym-${crypto.randomUUID().slice(0, 8)}`;
      user = await db.user.create({
        data: { email, name, password: await bcrypt.hash(tempPassword, 10) },
      });
    }

    // Check if already a member of this tenant
    const existing = await db.tenantUser.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
    });

    if (existing) {
      // Add MEMBER role if not present
      if (!existing.roles.includes("MEMBER")) {
        await db.tenantUser.update({
          where: { id: existing.id },
          data: { roles: [...new Set<TenantRole>([...existing.roles, "MEMBER"])] },
        });
      }
      return NextResponse.json(
        { message: "El usuario ya está registrado en este gym", data: { tenantUserId: existing.id } },
        { status: 200 }
      );
    }

    const tenantUser = await db.tenantUser.create({
      data: { userId: user.id, tenantId, roles: ["MEMBER"] },
    });

    // Send welcome email with temp password
    if (tempPassword) {
      const h = await headers();
      const host = h.get("host") || "";
      const protocol = host.includes("localhost") ? "http" : "https";
      const baseUrl = `${protocol}://${host}`;
      const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
      const gymName = tenant?.name ?? "Gymni";

      sendEmail({
        to: email,
        subject: `Bienvenido a ${gymName}`,
        react: WelcomeEmail({
          gymName,
          userName: name,
          tempPassword,
          loginUrl: `${baseUrl}/login`,
          changePasswordUrl: `${baseUrl}/forgot-password`,
        }),
      }).catch((err) => console.error("[welcome email]", err));
    }

    return NextResponse.json(
      { message: "Miembro agregado correctamente", data: { tenantUserId: tenantUser.id, isNewUser: !!tempPassword } },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al agregar miembro" }, { status: 400 });
  }
}
