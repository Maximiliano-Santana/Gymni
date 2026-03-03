import { NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../lib/validation";
import { AddMemberSchema } from "@/features/members/types";
import { TenantRole } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);

    const tenantUsers = await db.tenantUser.findMany({
      where: { tenantId, roles: { has: "MEMBER" } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        memberSubscriptions: {
          where: { status: { not: "CANCELED" } },
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { plan: { select: { name: true } } },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    const data = tenantUsers.map((tu) => {
      const sub = tu.memberSubscriptions[0] ?? null;
      return {
        id: tu.id,
        userId: tu.userId,
        name: tu.user.name,
        email: tu.user.email,
        roles: tu.roles,
        status: tu.status,
        subscription: sub
          ? {
              planName: sub.plan.name,
              status: sub.status,
              billingEndsAt: sub.billingEndsAt.toISOString(),
            }
          : null,
      };
    });

    return NextResponse.json({ data });
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
    if (!user) {
      const tempPassword = await bcrypt.hash(crypto.randomUUID(), 10);
      user = await db.user.create({
        data: { email, name, password: tempPassword },
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

    return NextResponse.json(
      { message: "Miembro agregado correctamente", data: { tenantUserId: tenantUser.id } },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al agregar miembro" }, { status: 400 });
  }
}
