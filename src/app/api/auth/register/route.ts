import { RegisterDTO, RegisterSchema } from "@/features/auth/types/forms";
import { validateRequest } from "@/app/api/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import CreateUser from "@/features/auth/server";
import db from "@/lib/prisma";
import bcrypt from 'bcryptjs'
export async function POST(request: NextRequest) {
  //Validación de datos
  const newUser: RegisterDTO = await request.json();
  const validation = validateRequest(RegisterSchema, newUser);
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
      { message: "Email already exists" },
      { status: 400 }
    );
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
      createdAt: true
    }
  });

  //Se crea relación a su nuevo 

  if (user) {
    return NextResponse.json({  message: "User created successfully", user });
  } else {
    return NextResponse.json(
      { message: "Error creating user" },
      { status: 500 }
    );
  }
}
