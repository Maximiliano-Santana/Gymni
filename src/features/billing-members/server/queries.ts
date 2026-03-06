import db from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { localMidnightToUTC } from "@/lib/timezone";
import type {
  PaymentListItem,
  PaymentMethodFilter,
  PaginatedPayments,
  PaymentStats,
} from "../types/payment-list";

const PAGE_SIZE = 20;

function addDateFilter(
  where: Prisma.MemberPaymentWhereInput,
  from?: string,
  to?: string,
  tz?: string,
) {
  if (!from && !to) return;
  const paidAt: Prisma.DateTimeFilter = {};
  if (from) paidAt.gte = localMidnightToUTC(from, tz);
  if (to) {
    // "to" is inclusive — add 1 day
    const [y, m, d] = to.split("-").map(Number);
    const nextDay = new Date(y, m - 1, d + 1);
    const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, "0")}-${String(nextDay.getDate()).padStart(2, "0")}`;
    paidAt.lt = localMidnightToUTC(nextDayStr, tz);
  }
  where.paidAt = paidAt;
}

export async function queryPayments({
  tenantId,
  search,
  method,
  page = 1,
  from,
  to,
  tz,
}: {
  tenantId: string;
  search?: string;
  method?: PaymentMethodFilter;
  page?: number;
  from?: string;
  to?: string;
  tz?: string;
}): Promise<PaginatedPayments> {
  const where: Prisma.MemberPaymentWhereInput = { tenantId };

  // Method filter
  if (method && method !== "all") {
    where.method = method;
  }

  // Date range filter
  addDateFilter(where, from, to, tz);

  // Search filter — name, email, or reference
  if (search) {
    where.OR = [
      {
        invoice: {
          subscription: {
            tenantUser: {
              user: { name: { contains: search, mode: "insensitive" } },
            },
          },
        },
      },
      {
        invoice: {
          subscription: {
            tenantUser: {
              user: { email: { contains: search, mode: "insensitive" } },
            },
          },
        },
      },
      { reference: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * PAGE_SIZE;

  // totalCents aggregate excludes voided payments
  const aggWhere = { ...where, voidedAt: null };

  const [payments, total, agg] = await Promise.all([
    db.memberPayment.findMany({
      where,
      include: {
        invoice: {
          include: {
            subscription: {
              include: {
                plan: { select: { name: true } },
                tenantUser: {
                  include: {
                    user: { select: { name: true, email: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { paidAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.memberPayment.count({ where }),
    db.memberPayment.aggregate({ where: aggWhere, _sum: { amountCents: true } }),
  ]);

  const data: PaymentListItem[] = payments.map((p) => ({
    id: p.id,
    paidAt: p.paidAt.toISOString(),
    amountCents: p.amountCents,
    method: p.method,
    reference: p.reference,
    receivedBy: p.receivedBy,
    memberName: p.invoice.subscription.tenantUser.user.name,
    memberEmail: p.invoice.subscription.tenantUser.user.email,
    planName: p.invoice.subscription.plan.name,
    voidedAt: p.voidedAt?.toISOString() ?? null,
    voidedBy: p.voidedBy ?? null,
    voidReason: p.voidReason ?? null,
  }));

  return {
    data,
    total,
    totalCents: agg._sum.amountCents ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function queryPaymentStats({
  tenantId,
  from,
  to,
  tz,
}: {
  tenantId: string;
  from: string;
  to: string;
  tz: string;
}): Promise<PaymentStats> {
  const fromDate = localMidnightToUTC(from, tz);
  const [y, m, d] = to.split("-").map(Number);
  const nextDay = new Date(y, m - 1, d + 1);
  const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, "0")}-${String(nextDay.getDate()).padStart(2, "0")}`;
  const toDate = localMidnightToUTC(nextDayStr, tz);

  const [byMethod, byDay] = await Promise.all([
    db.memberPayment.groupBy({
      by: ["method"],
      where: {
        tenantId,
        voidedAt: null,
        paidAt: { gte: fromDate, lt: toDate },
      },
      _sum: { amountCents: true },
      orderBy: { _sum: { amountCents: "desc" } },
    }),
    db.$queryRaw<{ date: string; totalCents: bigint }[]>`
      SELECT
        TO_CHAR("paidAt" AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS "date",
        SUM("amountCents")::bigint AS "totalCents"
      FROM "member_payments"
      WHERE "tenantId" = ${tenantId}
        AND "voidedAt" IS NULL
        AND "paidAt" >= ${fromDate}
        AND "paidAt" < ${toDate}
      GROUP BY 1
      ORDER BY 1
    `,
  ]);

  return {
    byMethod: byMethod.map((r) => ({
      method: r.method,
      totalCents: r._sum.amountCents ?? 0,
    })),
    byDay: byDay.map((r) => ({
      date: r.date,
      totalCents: Number(r.totalCents),
    })),
  };
}
