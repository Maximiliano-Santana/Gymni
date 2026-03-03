import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { headers } from "next/headers";
import db from "@/lib/prisma";
import MembersTable from "@/features/admin/components/MembersTable";
import type { MemberListItem } from "@/features/members/types";

export default async function MembersPage() {
  const [session, h] = await Promise.all([
    getServerSession(authOptions),
    headers(),
  ]);
  const sub = h.get("x-tenant-subdomain")!;
  const tenantId = session!.user.tenants?.[sub]?.tenantId as string;

  const tenantUsers = await db.tenantUser.findMany({
    where: { tenantId, roles: { has: "MEMBER" } },
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
  });

  const members: MemberListItem[] = tenantUsers.map((tu) => {
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Miembros</h1>
      <MembersTable initialMembers={members} />
    </div>
  );
}
