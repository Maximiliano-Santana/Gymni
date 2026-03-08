import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import PasswordResetEmail from "@/emails/PasswordResetEmail";
import { rateLimiters, getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 per hour per IP
    const limited = await checkRateLimit(rateLimiters.forgotPassword, getClientIp(req));
    if (limited) return limited;

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "Email requerido" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Always respond 200 to avoid email enumeration
    const successResponse = NextResponse.json(
      { message: "Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña." },
      { status: 200 }
    );

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Consistent timing: wait similar to the email-sending path to prevent enumeration
      await new Promise((r) => setTimeout(r, 150 + Math.random() * 100));
      return successResponse;
    }

    // Delete previous tokens for this email
    await db.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    // Create new token (1 hour expiry)
    const token = crypto.randomUUID();
    await db.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Build reset URL from the request origin
    const origin = req.headers.get("origin") || req.nextUrl.origin;
    const resetUrl = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    await sendEmail({
      to: normalizedEmail,
      subject: "Restablecer contraseña",
      react: PasswordResetEmail({ resetUrl }),
    });

    return successResponse;
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json(
      { message: "Ocurrió un error" },
      { status: 500 }
    );
  }
}
