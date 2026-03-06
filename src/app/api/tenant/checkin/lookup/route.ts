import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../../lib/validation";
import { CheckInLookupSchema } from "@/features/checkin/types";
import { getDayBoundsUTC } from "@/lib/timezone";
import type { TenantSettings } from "@/features/tenants/types/settings";

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);

    const body = await request.json().catch(() => ({}));
    const parsed = CheckInLookupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Token QR inválido" },
        { status: 400 }
      );
    }

    const tu = await db.tenantUser.findFirst({
      where: { qrToken: parsed.data.qrToken, tenantId },
      include: {
        user: { select: { name: true, email: true, image: true } },
        memberSubscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { plan: { select: { name: true } } },
        },
      },
    });

    if (!tu) {
      return NextResponse.json(
        { message: "Miembro no encontrado" },
        { status: 404 }
      );
    }

    // Check if already checked in today (in gym's timezone)
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const tz = (tenant?.settings as unknown as TenantSettings)?.timezone ?? "America/Mexico_City";
    const { start: todayStart, end: todayEnd } = getDayBoundsUTC(tz);

    const todayCheckIn = await db.checkIn.findFirst({
      where: {
        tenantUserId: tu.id,
        tenantId,
        checkedInAt: { gte: todayStart, lte: todayEnd },
      },
    });

    const activeSub = tu.memberSubscriptions[0] ?? null;

    let warning: string | null = null;
    if (!activeSub) {
      warning = "Sin membresía activa";
    } else if (activeSub.status === "PAST_DUE") {
      warning = "Membresía con adeudo";
    } else if (activeSub.status === "CANCELED") {
      warning = "Membresía cancelada";
    } else if (activeSub.billingEndsAt < new Date()) {
      warning = "Membresía vencida";
    }

    const data = {
      id: tu.id,
      name: tu.user.name,
      email: tu.user.email,
      image: tu.user.image,
      status: tu.status,
      subscription: activeSub
        ? {
            planName: activeSub.plan.name,
            status: activeSub.status,
            billingEndsAt: activeSub.billingEndsAt.toISOString(),
          }
        : null,
      lastCheckIn: todayCheckIn
        ? todayCheckIn.checkedInAt.toISOString()
        : null,
      warning,
    };

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al buscar miembro" }, { status: 500 });
  }
}
