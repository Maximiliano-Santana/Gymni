import { RegisterDTO, RegisterSchema } from "@/features/auth/types/forms";
import { validateRequest } from "@/app/api/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { TenantRole } from "@prisma/client";
export async function POST(request: NextRequest) {
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

  //Si usuario no existe se crea
  if (!user) {
    user = await db.user.create({
      data: {
        name: newUser.name,
        email: newUser.email,
        password: await bcrypt.hash(newUser.password, 10),
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
    console.log("Usuario creado", user);
  }

  //Si solo es registro global se retorna respuesta
  if (user && !tenant && !invitation) {
    return NextResponse.json(
      { message: "Usuario en Gym&i creado correctamente." },
      { status: 200 }
    );
  }

  //Si hay invitacion crea/actualiza relacion
  if (invitation) {
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

    return NextResponse.json(
      { message: `Usuario creado correctamente por invitación.` },
      { status: 200 }
    );
  }

  //Si hay tenant se crea/actualiza relación
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
    return NextResponse.json(
      { message: `Usuario creado correctamente en ${tenant.name}.` },
      { status: 200 }
    );
  }
}
