import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../../lib/validation";
import { CheckInConfirmSchema } from "@/features/checkin/types";

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);
    const session = await getServerSession(authOptions);

    const body = await request.json().catch(() => ({}));
    const parsed = CheckInConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "ID de miembro requerido" },
        { status: 400 }
      );
    }

    // Verify member belongs to this tenant
    const tu = await db.tenantUser.findFirst({
      where: { id: parsed.data.tenantUserId, tenantId },
    });
    if (!tu) {
      return NextResponse.json(
        { message: "Miembro no encontrado" },
        { status: 404 }
      );
    }

    // Check for duplicate check-in today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existing = await db.checkIn.findFirst({
      where: {
        tenantUserId: tu.id,
        tenantId,
        checkedInAt: { gte: todayStart, lte: todayEnd },
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Ya registró asistencia hoy" },
        { status: 409 }
      );
    }

    const checkIn = await db.checkIn.create({
      data: {
        tenantId,
        tenantUserId: tu.id,
        checkedInBy: session?.user?.id ?? null,
      },
    });

    return NextResponse.json({
      data: {
        id: checkIn.id,
        checkedInAt: checkIn.checkedInAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al registrar check-in" }, { status: 500 });
  }
}
