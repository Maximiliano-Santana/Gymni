import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const passwordRegex =
  /^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%&_*+/()?^-])[A-Za-z\d!@#$%&_*+/()?^-]{6,}$/;

const ResetSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z
    .string()
    .min(6)
    .regex(passwordRegex, "Debe tener minúscula, número y símbolo"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ResetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos inválidos" },
        { status: 400 }
      );
    }

    const { email, token, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Find valid token
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        token,
        expires: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { message: "El enlace es inválido o ha expirado" },
        { status: 400 }
      );
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.user.update({
      where: { email: normalizedEmail },
      data: { password: hashedPassword },
    });

    // Delete used token
    await db.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    return NextResponse.json(
      { message: "Contraseña actualizada correctamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { message: "Ocurrió un error" },
      { status: 500 }
    );
  }
}
