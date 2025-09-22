import { NextRequest, NextResponse } from "next/server";
import {
  validateRequest,
  validateSuperAdmin,
  validateTenantAdmin,
} from "../../lib/validation";
import { InvitationDTO, InvitationSchema } from "@/features/auth/types/forms";
import db from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const isSuperAdmin = await validateSuperAdmin(req);
  const newInvitation: InvitationDTO = await req.json();
  const validation = validateRequest(InvitationSchema, newInvitation);
  if (!validation.success) {
    return Response.json({ message: "Campos invalidos" }, { status: 400 });
  }
  const isTenantAdmin = await validateTenantAdmin(req, newInvitation.tenantId);

  if (!isSuperAdmin.success && !isTenantAdmin.success) {
    return Response.json(
      { message: "No tienes permisos para hacer esto" },
      { status: 401 }
    );
  }
  const tenant = await db.tenant.findUnique({
    where: {
      id: newInvitation.tenantId,
    },
  });

  if (!tenant) {
    return Response.json({ message: "Tenant no existe" }, { status: 400 });
  }

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

  return NextResponse.json({ ok: true });
}
