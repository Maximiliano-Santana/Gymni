import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import VerifyEmail from "@/emails/VerifyEmail";

export async function POST(req: NextRequest) {
  try {
    const { token, email, resend } = await req.json();
    const normalized = (email as string)?.toLowerCase().trim();

    if (!normalized) {
      return NextResponse.json({ message: "Email requerido" }, { status: 400 });
    }

    // Resend verification email
    if (resend) {
      const user = await db.user.findUnique({
        where: { email: normalized },
        select: { emailVerified: true },
      });

      if (!user) {
        return NextResponse.json({ message: "OK" }); // Don't reveal if user exists
      }

      if (user.emailVerified) {
        return NextResponse.json({ message: "Email ya verificado" });
      }

      // Delete previous tokens and create new one
      await db.verificationToken.deleteMany({
        where: { identifier: `verify:${normalized}` },
      });

      const newToken = crypto.randomUUID();
      await db.verificationToken.create({
        data: {
          identifier: `verify:${normalized}`,
          token: newToken,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const origin = req.headers.get("origin") || req.nextUrl.origin;
      const verifyUrl = `${origin}/verify-email?token=${newToken}&email=${encodeURIComponent(normalized)}`;

      await sendEmail({
        to: normalized,
        subject: "Verifica tu correo — Gymni",
        react: VerifyEmail({ verifyUrl }),
      });

      return NextResponse.json({ message: "Email de verificación reenviado" });
    }

    // Verify token
    if (!token) {
      return NextResponse.json({ message: "Token requerido" }, { status: 400 });
    }

    const record = await db.verificationToken.findFirst({
      where: {
        identifier: `verify:${normalized}`,
        token,
        expires: { gt: new Date() },
      },
    });

    if (!record) {
      return NextResponse.json(
        { message: "El enlace es inválido o ha expirado" },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { email: normalized },
      data: { emailVerified: new Date() },
    });

    await db.verificationToken.deleteMany({
      where: { identifier: `verify:${normalized}` },
    });

    return NextResponse.json({ message: "Email verificado correctamente" });
  } catch (error) {
    console.error("[verify-email]", error);
    return NextResponse.json(
      { message: "Ocurrió un error" },
      { status: 500 }
    );
  }
}
