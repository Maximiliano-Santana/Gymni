import { NextRequest, NextResponse } from "next/server";
import {
  requireTenantRoles,
  validateRequest,
} from "../../lib/validation";
import { InvitationDTO, InvitationSchema } from "@/features/auth/types/forms";
import db from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import InvitationEmail from "@/emails/InvitationEmail";

export async function POST(req: NextRequest) {
  try {
    //Validacion de permisos y campos para invite
    const isAllowed = await requireTenantRoles(["ADMIN", "OWNER"]);
    if (!isAllowed) {
      return Response.json(
        { message: "No tienes permisos para hacer esto" },
        { status: 401 }
      );
    }

    const newInvitation: InvitationDTO = await req.json();
    const validation = validateRequest(InvitationSchema, newInvitation);
    if (!validation.success) {
      return Response.json({ message: "Campos invalidos" }, { status: 400 });
    }

    // Use tenantId from JWT (not body) to prevent cross-tenant attacks
    newInvitation.tenantId = isAllowed.tenantId;

    // Validate role assignment permissions: OWNER can assign OWNER/ADMIN/STAFF, ADMIN can only assign STAFF
    const isOwner = isAllowed.roles.includes("OWNER");
    const canAssign = isOwner
      ? ["OWNER", "ADMIN", "STAFF"].includes(newInvitation.role)
      : newInvitation.role === "STAFF";
    if (!canAssign) {
      return NextResponse.json(
        { message: "No tienes permisos para asignar este rol" },
        { status: 403 }
      );
    }

    const tenant = await db.tenant.findUnique({
      where: {
        id: isAllowed.tenantId,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { message: "Tenant no existe" },
        { status: 400 }
      );
    }

    // Actualizacion de TenantUser en caso de un usuario ya registrado
    const user = await db.user.findUnique({
      where: { email: newInvitation.email },
    });

    if (user) {
      // Auto-verify email if admin is adding this user
      if (!user.emailVerified) {
        await db.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }

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

      // Notify existing user they were added
      const origin = req.headers.get("origin") || req.nextUrl.origin;
      sendEmail({
        to: newInvitation.email,
        subject: `Te invitaron a ${tenant.name}`,
        react: InvitationEmail({
          gymName: tenant.name,
          role: newInvitation.role,
          inviteUrl: `${origin}/login`,
        }),
      }).catch((err) => console.error("[invitation email]", err));

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

    // Send invitation email
    const origin = req.headers.get("origin") || req.nextUrl.origin;
    const inviteUrl = `${origin}/register?invitation=${invitation.id}`;
    sendEmail({
      to: newInvitation.email,
      subject: `Te invitaron a ${tenant.name}`,
      react: InvitationEmail({
        gymName: tenant.name,
        role: newInvitation.role,
        inviteUrl,
      }),
    }).catch((err) => console.error("[invitation email]", err));

    return Response.json(
      { message: "Invitación enviada", invitation: { id: invitation.id } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[invitation]", err);
    return NextResponse.json(
      { message: "Ocurrió un error" },
      { status: 500 }
    );
  }
}
