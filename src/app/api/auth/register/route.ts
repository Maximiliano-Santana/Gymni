import { RegisterDTO, RegisterSchema } from "@/features/auth/types/forms";
import { validateRequest } from "@/app/api/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import bcrypt from "bcryptjs";
export async function POST(request: NextRequest) {
  //Validación de datos
  const newUser: RegisterDTO = await request.json();
  const validation = validateRequest(RegisterSchema, newUser);
  let invitation;
  let tenant;
  if (!validation.success) {
    return NextResponse.json({ message: validation.message }, { status: 400 });
  }

  //Validar que el usuario no exista
  const emailFound = await db.user.findUnique({
    where: {
      email: newUser.email,
    },
  });
  if (emailFound) {
    return NextResponse.json(
      { message: "Usuario ya registrado" },
      { status: 409 }
    );
  }

  //Validar que el tenant exista si viene relacionado
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

  //Validar que el invite exista y sea valida
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

  //Se crea nuevo usuario
  const user = await db.user.create({
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

  if (user) {
    //Se crea relación tenant user
    if (invitation && tenant) {
      const tenantUser = await db.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          roles: [invitation.role],
          status: "ACTIVE",
        },
      });
      if (!tenantUser) {
        return NextResponse.json(
          {
            message: "Ocurrió un error al asignar el usuario a su tenant",
            user,
          },
          { status: 500 }
        );
      }
      await db.invitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          usedAt: new Date(),
        },
      });
      return NextResponse.json({
        message: "Usuario creado correctamente",
        user,
      });
    } else if (tenant) {
      const tenantUser = await db.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          roles: ["MEMBER"],
          status: "ACTIVE",
        },
      });
      if (!tenantUser) {
        return NextResponse.json(
          {
            message: "Ocurrió un error al asignar el usuario a su tenant",
            user,
          },
          { status: 500 }
        );
      }
      return NextResponse.json({
        message: "Usuario creado correctamente",
        user,
      });
    }
  } else {
    return NextResponse.json(
      { message: "Error creating user" },
      { status: 500 }
    );
  }
}
