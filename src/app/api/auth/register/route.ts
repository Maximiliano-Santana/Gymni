import { RegisterDTO, RegisterSchema } from "@/features/auth/types/forms";
import { validateRequest } from "@/app/api/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { TenantRole } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import WelcomeEmail from "@/emails/WelcomeEmail";
import VerifyEmail from "@/emails/VerifyEmail";
import { rateLimiters, getClientIp, checkRateLimit } from "@/lib/rate-limit";
import type { TenantSettings } from "@/features/tenants/types/settings";

async function sendVerificationEmail(email: string, origin: string) {
  // Delete previous verification tokens
  await db.verificationToken.deleteMany({
    where: { identifier: `verify:${email}` },
  });

  const verifyToken = crypto.randomUUID();
  await db.verificationToken.create({
    data: {
      identifier: `verify:${email}`,
      token: verifyToken,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  const verifyUrl = `${origin}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;

  await sendEmail({
    to: email,
    subject: "Verifica tu correo — Gymni",
    react: VerifyEmail({ verifyUrl }),
  });
}

export async function POST(request: NextRequest) {
  // Rate limit: 3 registrations per hour per IP
  const limited = await checkRateLimit(rateLimiters.register, getClientIp(request));
  if (limited) return limited;

  //Validación de datos
  const newUser: RegisterDTO = await request.json();
  const validation = validateRequest(RegisterSchema, newUser);
  let invitation;
  let tenant;
  let user;
  if (!validation.success) {
    return NextResponse.json({ message: validation.message }, { status: 400 });
  }

  //Validacion de tenant
  if (newUser.tenantId) {
    tenant = await db.tenant.findUnique({
      where: {
        id: newUser.tenantId,
      },
    });

    if (!tenant) {
      return NextResponse.json({ message: "Gym no existe" }, { status: 403 });
    }

    // Block public registration early (before user creation)
    if (!newUser.invitation) {
      const tenantSettings = tenant.settings as TenantSettings | null;
      if (!tenantSettings?.allowPublicRegistration) {
        return NextResponse.json(
          { message: "Este gimnasio no permite registro público. Acércate a recepción para crear tu cuenta." },
          { status: 403 }
        );
      }
    }
  }

  //Validacion de invite
  if (newUser.invitation) {
    invitation = await db.invitation.findUnique({
      where: {
        id: newUser.invitation,
      },
    });
    if (!invitation) {
      return NextResponse.json(
        { message: "La invitación no existe" },
        { status: 403 }
      );
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { message: "La invitación ha expirado" },
        { status: 410 }
      );
    }
    if (invitation.usedAt) {
      return NextResponse.json(
        { message: "Esta invitación ha sido utilizada" },
        { status: 410 }
      );
    }
    if (invitation.email !== newUser.email) {
      return NextResponse.json(
        { message: "Email no autorizado" },
        { status: 403 }
      );
    }
  }

  //Validacion de usuario
  user = await db.user.findUnique({
    where: {
      email: newUser.email,
    },
  });

  //Si usuario global existía se termina registro
  if (user && !invitation && !tenant) {
    return NextResponse.json(
      { message: "Usuario en Gym&i ya registrado." },
      { status: 409 }
    );
  }

  const origin = request.headers.get("origin") || request.nextUrl.origin;

  //Si usuario no existe se crea
  if (!user) {
    user = await db.user.create({
      data: {
        name: newUser.name,
        email: newUser.email,
        password: await bcrypt.hash(newUser.password, 10),
        // Invitation/admin-created users are auto-verified
        emailVerified: invitation ? new Date() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    console.log("Usuario creado", user);
  }

  //Si solo es registro global se retorna respuesta
  if (user && !tenant && !invitation) {
    // Send verification email for self-register
    if (!user.emailVerified) {
      await sendVerificationEmail(newUser.email, origin);
    }
    return NextResponse.json(
      { message: "Usuario en Gym&i creado correctamente." },
      { status: 200 }
    );
  }

  //Si hay invitacion crea/actualiza relacion
  if (invitation) {
    // Auto-verify existing user if registering via invitation
    if (!user.emailVerified) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    //Validacion de relación
    const tenantUser = await db.tenantUser.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: invitation.tenantId,
        },
      },
    });
    //NO existe relación se crea
    if (!tenantUser) {
      await db.tenantUser.create({
        data: {
          userId: user.id,
          tenantId: invitation.tenantId,
          roles: [invitation.role],
        },
      });
      //SI existe relacion se actualiza
    } else {
      const mergedRoles = Array.from(
        new Set([...(tenantUser.roles ?? []), invitation.role])
      );
      await db.tenantUser.update({
        where: {
          userId_tenantId: {
            userId: tenantUser.userId,
            tenantId: tenantUser.tenantId,
          },
        },
        data: { roles: { set: mergedRoles } },
      });
    }

    //Se marca invitación como usada
    await db.invitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Send welcome email
    const invTenant = await db.tenant.findUnique({ where: { id: invitation.tenantId }, select: { name: true } });
    sendEmail({
      to: newUser.email,
      subject: `Bienvenido a ${invTenant?.name ?? "Gymni"}`,
      react: WelcomeEmail({ gymName: invTenant?.name ?? "Gymni", userName: newUser.name }),
    }).catch((err) => console.error("[welcome email]", err));

    return NextResponse.json(
      { message: `Usuario creado correctamente por invitación.` },
      { status: 200 }
    );
  }

  //Si hay tenant se crea/actualiza relación (registro público)
  if (tenant && !invitation) {
    //Valida existencia de relación
    const tenantUser = await db.tenantUser.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
    });
    //NO existe relacion se crea
    if (!tenantUser) {
      await db.tenantUser.create({
        data: {
          userId: user.id,
          tenantId: newUser.tenantId!,
          roles: ["MEMBER"],
        },
      });
      //SI existe relación se actualiza
    } else {
      const mergedRoles = [
        ...new Set<TenantRole>([
          ...(tenantUser.roles ?? []),
          TenantRole.MEMBER,
        ]),
      ];

      await db.tenantUser.update({
        where: {
          userId_tenantId: {
            userId: tenantUser.userId,
            tenantId: tenantUser.tenantId,
          },
        },
        data: { roles: { set: mergedRoles } },
      });
    }

    // Send verification email if not verified
    if (!user.emailVerified) {
      await sendVerificationEmail(newUser.email, origin);
    }

    // Send welcome email
    sendEmail({
      to: newUser.email,
      subject: `Bienvenido a ${tenant.name}`,
      react: WelcomeEmail({ gymName: tenant.name, userName: newUser.name }),
    }).catch((err) => console.error("[welcome email]", err));

    return NextResponse.json(
      { message: `Usuario creado correctamente en ${tenant.name}.` },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { message: "No se pudo procesar el registro." },
    { status: 400 }
  );
}
