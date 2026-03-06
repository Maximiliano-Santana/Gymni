import { NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../lib/validation";
import { todayInTimezone, localMidnightToUTC } from "@/lib/timezone";
import type { TenantSettings } from "@/features/tenants/types/settings";

export async function GET() {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);

    const tenantData = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const tz = (tenantData?.settings as TenantSettings)?.timezone ?? "America/Mexico_City";

    const now = new Date();
    const nowStr = todayInTimezone(tz);
    const [nowY, nowM] = nowStr.split("-").map(Number);
    const startOfMonth = localMidnightToUTC(`${nowY}-${String(nowM).padStart(2, "0")}-01`, tz);
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const [
      activeMembers,
      activeSubscriptions,
      expiringSubscriptions,
      monthlyPayments,
    ] = await Promise.all([
      // Active members count
      db.tenantUser.count({
        where: { tenantId, roles: { has: "MEMBER" }, status: "ACTIVE" },
      }),
      // Active subscriptions count
      db.memberSubscription.count({
        where: { tenantId, status: "ACTIVE" },
      }),
      // Subscriptions expiring in next 7 days
      db.memberSubscription.count({
        where: {
          tenantId,
          status: "ACTIVE",
          billingEndsAt: { gte: now, lte: in7Days },
        },
      }),
      // Revenue this month
      db.memberPayment.aggregate({
        where: {
          tenantId,
          paidAt: { gte: startOfMonth },
        },
        _sum: { amountCents: true },
      }),
    ]);

    return NextResponse.json({
      data: {
        activeMembers,
        activeSubscriptions,
        expiringSubscriptions,
        monthlyRevenueCents: monthlyPayments._sum.amountCents ?? 0,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al obtener dashboard" }, { status: 400 });
  }
}
