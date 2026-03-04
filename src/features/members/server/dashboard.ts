import "server-only";
import db from "@/lib/prisma";

export type MemberDashboardData = {
  member: { name: string | null };
  subscription: {
    planName: string;
    status: string;
    billingEndsAt: string;
    daysLeft: number;
    invoice: {
      status: string;
      amountCents: number;
      currency: string;
      dueAt: string | null;
    } | null;
  } | null;
  attendance: {
    thisMonth: number;
    lastMonth: number;
  };
  streak: { current: number; record: number };
  monthlyAttendance: { mes: string; asistencias: number }[];
  recentCheckIns: { id: string; checkedInAt: string }[];
};

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function computeStreaks(checkIns: { checkedInAt: Date }[]) {
  if (checkIns.length === 0) return { current: 0, record: 0 };

  // Collect unique dates (YYYY-MM-DD) and sort descending
  const uniqueDays = [
    ...new Set(
      checkIns.map((c) => {
        const d = new Date(c.checkedInAt);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })
    ),
  ].sort((a, b) => b.localeCompare(a)); // newest first

  const toDate = (s: string) => new Date(s + "T00:00:00");

  // Current streak: walk backwards from today or yesterday
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  let current = 0;
  let cursor = uniqueDays[0] === todayStr ? toDate(todayStr) : null;

  // If latest check-in is yesterday, start from yesterday
  if (!cursor) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    if (uniqueDays[0] === yesterdayStr) {
      cursor = toDate(yesterdayStr);
    }
  }

  if (cursor) {
    for (const dayStr of uniqueDays) {
      const expected = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (dayStr === expected) {
        current++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (dayStr < expected) {
        break;
      }
    }
  }

  // Record streak: scan all sorted days
  let record = 0;
  let run = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = toDate(uniqueDays[i - 1]);
    const curr = toDate(uniqueDays[i]);
    const diffMs = prev.getTime() - curr.getTime();
    if (diffMs === 86400000) {
      run++;
    } else {
      record = Math.max(record, run);
      run = 1;
    }
  }
  record = Math.max(record, run, current);

  return { current, record };
}

function aggregateMonthly(checkIns: { checkedInAt: Date }[]) {
  const now = new Date();
  const months: { key: string; mes: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, mes: MONTH_NAMES[d.getMonth()] });
  }

  const counts = new Map<string, number>();
  for (const c of checkIns) {
    const d = new Date(c.checkedInAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return months.map((m) => ({ mes: m.mes, asistencias: counts.get(m.key) ?? 0 }));
}

export async function getMemberDashboardData(
  userId: string,
  tenantId: string
): Promise<MemberDashboardData | null> {
  const tenantUser = await db.tenantUser.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    select: { id: true, user: { select: { name: true } } },
  });

  if (!tenantUser) return null;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [subscription, thisMonthCount, lastMonthCount, allCheckIns, recentCheckIns] =
    await Promise.all([
      db.memberSubscription.findFirst({
        where: {
          tenantUserId: tenantUser.id,
          status: { in: ["ACTIVE", "PAST_DUE"] },
        },
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          billingEndsAt: true,
          plan: { select: { name: true } },
          invoices: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              status: true,
              amountCents: true,
              currency: true,
              dueAt: true,
            },
          },
        },
      }),
      db.checkIn.count({
        where: {
          tenantUserId: tenantUser.id,
          checkedInAt: { gte: thisMonthStart },
        },
      }),
      db.checkIn.count({
        where: {
          tenantUserId: tenantUser.id,
          checkedInAt: { gte: lastMonthStart, lt: thisMonthStart },
        },
      }),
      db.checkIn.findMany({
        where: {
          tenantUserId: tenantUser.id,
          checkedInAt: { gte: sixMonthsAgo },
        },
        orderBy: { checkedInAt: "desc" },
        select: { checkedInAt: true },
      }),
      db.checkIn.findMany({
        where: { tenantUserId: tenantUser.id },
        orderBy: { checkedInAt: "desc" },
        take: 10,
        select: { id: true, checkedInAt: true },
      }),
    ]);

  const streak = computeStreaks(allCheckIns);
  const monthlyAttendance = aggregateMonthly(allCheckIns);

  const lastInvoice = subscription?.invoices[0] ?? null;
  const subData = subscription
    ? {
        planName: subscription.plan.name,
        status: subscription.status,
        billingEndsAt: subscription.billingEndsAt.toISOString(),
        daysLeft: Math.max(
          0,
          Math.ceil(
            (subscription.billingEndsAt.getTime() - now.getTime()) / 86400000
          )
        ),
        invoice: lastInvoice
          ? {
              status: lastInvoice.status,
              amountCents: lastInvoice.amountCents,
              currency: lastInvoice.currency,
              dueAt: lastInvoice.dueAt?.toISOString() ?? null,
            }
          : null,
      }
    : null;

  return {
    member: { name: tenantUser.user.name },
    subscription: subData,
    attendance: { thisMonth: thisMonthCount, lastMonth: lastMonthCount },
    streak,
    monthlyAttendance,
    recentCheckIns: recentCheckIns.map((c) => ({
      id: c.id,
      checkedInAt: c.checkedInAt.toISOString(),
    })),
  };
}
