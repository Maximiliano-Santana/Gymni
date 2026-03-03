import { NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../lib/validation";

export async function GET() {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
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
