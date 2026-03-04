import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { headers } from "next/headers";
import db from "@/lib/prisma";
import { generateQrToken } from "@/features/checkin/lib/qr-token";

export async function GET() {
  try {
    const [session, h] = await Promise.all([
      getServerSession(authOptions),
      headers(),
    ]);
    if (!session) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const sub = h.get("x-tenant-subdomain");
    if (!sub) {
      return NextResponse.json({ message: "Sin contexto de tenant" }, { status: 400 });
    }

    const info = session.user.tenants?.[sub];
    if (!info) {
      return NextResponse.json({ message: "No eres miembro de este gym" }, { status: 403 });
    }

    let tu = await db.tenantUser.findUnique({
      where: { userId_tenantId: { userId: session.user.id, tenantId: info.tenantId } },
      select: { id: true, qrToken: true },
    });

    if (!tu) {
      return NextResponse.json({ message: "No eres miembro de este gym" }, { status: 403 });
    }

    // Lazy generation: if no qrToken, create one
    if (!tu.qrToken) {
      tu = await db.tenantUser.update({
        where: { id: tu.id },
        data: { qrToken: generateQrToken() },
        select: { id: true, qrToken: true },
      });
    }

    return NextResponse.json({ data: { qrToken: tu.qrToken } });
  } catch {
    return NextResponse.json({ message: "Error al obtener QR" }, { status: 500 });
  }
}
