import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import db from "@/lib/prisma";
import { getSubdomain } from "@/features/tenants/lib";
import { getTenantSettings } from "@/features/tenants/types/settings";
import {
  todayInTimezone,
  localMidnightToUTC,
  getDayBoundsUTC,
} from "@/lib/timezone";
import AdminDashboard from "@/features/admin/components/AdminDashboard";

export default async function AdminDashboardPage() {
  const [session, sub] = await Promise.all([
    getServerSession(authOptions),
    getSubdomain(),
  ]);
  const subdomain = sub ?? "";
  const tenantId = session!.user.tenants?.[subdomain]?.tenantId as string;

  // Timezone
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  const tz =
    getTenantSettings(tenant ?? { settings: null })?.timezone ??
    "America/Mexico_City";

  // Date boundaries
  const now = new Date();
  const nowStr = todayInTimezone(tz);
  const [nowY, nowM] = nowStr.split("-").map(Number);
  const startOfMonth = localMidnightToUTC(
    `${nowY}-${String(nowM).padStart(2, "0")}-01`,
    tz
  );
  const prevMonthDate = new Date(nowY, nowM - 2, 1);
  const prevY = prevMonthDate.getFullYear();
  const prevM = prevMonthDate.getMonth() + 1;
  const startOfPrevMonth = localMidnightToUTC(
    `${prevY}-${String(prevM).padStart(2, "0")}-01`,
    tz
  );
  const { start: dayStart, end: dayEnd } = getDayBoundsUTC(tz);
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  // All queries in parallel
  const [
    activeMembers,
    newMembersThisMonth,
    checkInsToday,
    monthlyRevenue,
    prevMonthRevenue,
    expiringSubs,
    revenueByDay,
    checkInsByDay,
    activeSubs,
    pastDueSubs,
    totalWithSubs,
    totalMembers,
    revenueByPlan,
  ] = await Promise.all([
    // KPI: active members
    db.tenantUser.count({
      where: { tenantId, roles: { has: "MEMBER" }, status: "ACTIVE" },
    }),
    // KPI: new subscriptions this month (proxy for new members)
    db.memberSubscription.count({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth },
      },
    }),
    // KPI: check-ins today
    db.checkIn.count({
      where: { tenantId, checkedInAt: { gte: dayStart, lte: dayEnd } },
    }),
    // KPI: monthly revenue
    db.memberPayment.aggregate({
      where: { tenantId, paidAt: { gte: startOfMonth }, voidedAt: null },
      _sum: { amountCents: true },
    }),
    // KPI: previous month revenue (for comparison)
    db.memberPayment.aggregate({
      where: {
        tenantId,
        paidAt: { gte: startOfPrevMonth, lt: startOfMonth },
        voidedAt: null,
      },
      _sum: { amountCents: true },
    }),
    // KPI: expiring in 7 days
    db.memberSubscription.count({
      where: {
        tenantId,
        status: "ACTIVE",
        billingEndsAt: { gte: now, lte: in7Days },
      },
    }),
    // Chart: revenue by day
    db.$queryRaw<{ date: string; totalCents: bigint }[]>`
      SELECT DATE("paidAt" AT TIME ZONE ${tz})::text AS date,
             SUM("amountCents")::bigint AS "totalCents"
      FROM member_payments
      WHERE "tenantId" = ${tenantId}
        AND "paidAt" >= ${startOfMonth}
        AND "voidedAt" IS NULL
      GROUP BY 1
      ORDER BY 1
    `,
    // Chart: check-ins by day
    db.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("checkedInAt" AT TIME ZONE ${tz})::text AS date,
             COUNT(*)::bigint AS count
      FROM check_ins
      WHERE "tenantId" = ${tenantId}
        AND "checkedInAt" >= ${startOfMonth}
      GROUP BY 1
      ORDER BY 1
    `,
    // Donut: active subscriptions
    db.memberSubscription.count({
      where: { tenantId, status: "ACTIVE" },
    }),
    // Donut: past due subscriptions
    db.memberSubscription.count({
      where: { tenantId, status: "PAST_DUE" },
    }),
    // Donut: members with any subscription
    db.tenantUser.count({
      where: {
        tenantId,
        roles: { has: "MEMBER" },
        memberSubscriptions: { some: {} },
      },
    }),
    // Donut: total members
    db.tenantUser.count({
      where: { tenantId, roles: { has: "MEMBER" } },
    }),
    // Donut: revenue by plan
    db.$queryRaw<{ plan: string; totalCents: bigint }[]>`
      SELECT mp.name AS plan,
             SUM(pay."amountCents")::bigint AS "totalCents"
      FROM member_payments pay
      JOIN member_invoices inv ON pay."invoiceId" = inv.id
      JOIN member_subscriptions sub ON inv."subscriptionId" = sub.id
      JOIN membership_plans mp ON sub."planId" = mp.id
      WHERE pay."tenantId" = ${tenantId}
        AND pay."paidAt" >= ${startOfMonth}
        AND pay."voidedAt" IS NULL
      GROUP BY mp.name
      ORDER BY "totalCents" DESC
    `,
  ]);

  // Compute membership status distribution
  const canceledMembers = totalWithSubs - activeSubs - pastDueSubs;
  const sinPlanMembers = totalMembers - totalWithSubs;

  const data = {
    activeMembers,
    newMembersThisMonth,
    checkInsToday,
    monthlyRevenueCents: monthlyRevenue._sum.amountCents ?? 0,
    prevMonthRevenueCents: prevMonthRevenue._sum.amountCents ?? 0,
    expiringSubs,
    revenueByDay: revenueByDay.map((r) => ({
      date: r.date,
      totalCents: Number(r.totalCents),
    })),
    checkInsByDay: checkInsByDay.map((r) => ({
      date: r.date,
      count: Number(r.count),
    })),
    membershipsByStatus: [
      { status: "Activas", count: activeSubs },
      { status: "Con adeudo", count: pastDueSubs },
      { status: "Canceladas", count: Math.max(0, canceledMembers) },
      { status: "Sin plan", count: sinPlanMembers },
    ].filter((s) => s.count > 0),
    revenueByPlan: revenueByPlan.map((r) => ({
      plan: r.plan,
      totalCents: Number(r.totalCents),
    })),
  };

  return <AdminDashboard data={data} />;
}
