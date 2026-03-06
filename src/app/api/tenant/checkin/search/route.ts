import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "@/app/api/lib/validation";
import { CheckInSearchSchema } from "@/features/checkin/types";
import type { CheckInMemberInfo } from "@/features/checkin/types";
import { getDayBoundsUTC } from "@/lib/timezone";
import type { TenantSettings } from "@/features/tenants/types/settings";

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);

    const body = await request.json().catch(() => ({}));
    const parsed = CheckInSearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Búsqueda requerida" },
        { status: 400 }
      );
    }

    const { query } = parsed.data;

    const tenantUsers = await db.tenantUser.findMany({
      where: {
        tenantId,
        roles: { has: "MEMBER" },
        user: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
      },
      include: {
        user: { select: { name: true, email: true, image: true } },
        memberSubscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { plan: { select: { name: true } } },
        },
      },
      take: 5,
      orderBy: { user: { name: "asc" } },
    });

    // Check today's check-ins for all results (in gym's timezone)
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const tz = (tenant?.settings as unknown as TenantSettings)?.timezone ?? "America/Mexico_City";
    const { start: todayStart, end: todayEnd } = getDayBoundsUTC(tz);

    const checkIns = await db.checkIn.findMany({
      where: {
        tenantId,
        tenantUserId: { in: tenantUsers.map((tu) => tu.id) },
        checkedInAt: { gte: todayStart, lte: todayEnd },
      },
    });
    const checkedInIds = new Set(checkIns.map((c) => c.tenantUserId));

    const data: CheckInMemberInfo[] = tenantUsers.map((tu) => {
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

      const todayCheckIn = checkIns.find((c) => c.tenantUserId === tu.id);

      return {
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
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al buscar" }, { status: 500 });
  }
}
