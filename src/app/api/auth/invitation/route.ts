import { NextRequest, NextResponse } from "next/server";
import {
  validateRequest,
  validateSuperAdmin,
  validateTenantAdmin,
} from "../../lib/validation";
import { InvitationDTO, InvitationSchema } from "@/features/auth/types/forms";
import db from "@/lib/prisma";

export async function POST(req: NextRequest) {
  //Validacion de permisos y campos para invite
  const isSuperAdmin = await validateSuperAdmin();
  const newInvitation: InvitationDTO = await req.json();
  const validation = validateRequest(InvitationSchema, newInvitation);
  if (!validation.success) {
    return Response.json({ message: "Campos invalidos" }, { status: 400 });
  }
  const isTenantAdmin = await validateTenantAdmin(newInvitation.tenantId);

  if (!isSuperAdmin.success && !isTenantAdmin.success) {
    return Response.json(
      { message: "No tienes permisos para hacer esto" },
      { status: 401 }
    );
  }

  //Validacio de que el tenant existe
  const tenant = await db.tenant.findUnique({
    where: {
      id: newInvitation.tenantId,
    },
  });

  if (!tenant) {
    return NextResponse.json({ message: "Tenant no existe" }, { status: 400 });
  }

  //En caso de que el usuario ya este registrado se crea relacion tenant user
  const user = await db.user.findUnique({
    where: { email: newInvitation.email },
  });

  if (user) {
    const existing = await db.tenantUser.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: newInvitation.tenantId,
        },
      },
      select: { roles: true },
    });

    if (existing) {
      // unir roles evitando duplicados
      const merged = Array.from(
        new Set([...(existing.roles ?? []), newInvitation.role])
      );
      await db.tenantUser.update({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: newInvitation.tenantId,
          },
        },
        data: { roles: { set: merged } },
      });
    } else {
      await db.tenantUser.create({
        data: {
          tenantId: newInvitation.tenantId,
          userId: user.id,
          roles: [newInvitation.role], // array directo en create
        },
      });
    }

    return NextResponse.json(
      { message: "Usuario añadido al Gym" },
      { status: 200 }
    );
  }

  //Creacion de invite via email para registro
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  const invitation = await db.invitation.create({
    data: {
      email: newInvitation.email,
      tenantId: newInvitation.tenantId,
      role: newInvitation.role,
      expiresAt: expiresAt,
    },
  });
  return Response.json(
    { message: "Invitación enviada", invitation },
    { status: 200 }
  );
}
