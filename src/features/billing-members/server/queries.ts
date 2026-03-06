import db from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  PaymentListItem,
  PaymentMethodFilter,
  PaginatedPayments,
} from "../types/payment-list";

const PAGE_SIZE = 20;

export async function queryPayments({
  tenantId,
  search,
  method,
  page = 1,
}: {
  tenantId: string;
  search?: string;
  method?: PaymentMethodFilter;
  page?: number;
}): Promise<PaginatedPayments> {
  const where: Prisma.MemberPaymentWhereInput = { tenantId };

  // Method filter
  if (method && method !== "all") {
    where.method = method;
  }

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
