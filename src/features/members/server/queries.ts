import db from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { MemberListItem, MemberStatusFilter, PaginatedMembers } from "../types";

const PAGE_SIZE = 20;

export async function queryMembers({
  tenantId,
  search,
  status,
  page = 1,
}: {
  tenantId: string;
  search?: string;
  status?: MemberStatusFilter;
  page?: number;
}): Promise<PaginatedMembers> {
  const where: Prisma.TenantUserWhereInput = {
    tenantId,
    roles: { has: "MEMBER" },
  };

  // Search filter
  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  // Status filter
  if (status && status !== "all") {
    switch (status) {
      case "ACTIVE":
        where.memberSubscriptions = { some: { status: "ACTIVE" } };
        break;
      case "PAST_DUE":
        where.memberSubscriptions = { some: { status: "PAST_DUE" } };
        break;
      case "CANCELED":
        where.AND = [
          { memberSubscriptions: { some: {} } },
          { memberSubscriptions: { none: { status: { in: ["ACTIVE", "PAST_DUE"] } } } },
        ];
        break;
      case "sin_plan":
        where.memberSubscriptions = { none: {} };
        break;
    }
  }

  const skip = (page - 1) * PAGE_SIZE;

  const [tenantUsers, total] = await Promise.all([
    db.tenantUser.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        memberSubscriptions: {
          where: { status: { not: "CANCELED" } },
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { plan: { select: { name: true } } },
        },
      },
      orderBy: { user: { name: "asc" } },
      skip,
      take: PAGE_SIZE,
    }),
    db.tenantUser.count({ where }),
  ]);

  const data: MemberListItem[] = tenantUsers.map((tu) => {
    const sub = tu.memberSubscriptions[0] ?? null;
    return {
      id: tu.id,
      userId: tu.userId,
      name: tu.user.name,
      email: tu.user.email,
      roles: tu.roles,
      status: tu.status,
      subscription: sub
        ? {
            planName: sub.plan.name,
            status: sub.status,
            billingEndsAt: sub.billingEndsAt.toISOString(),
          }
        : null,
    };
  });

  return {
    data,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
