import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import db from "@/lib/prisma";
import { canAccess } from "@/features/admin/lib/permissions";
import type { TenantRole } from "@prisma/client";
import PlansView from "@/features/admin/components/PlansView";

export default async function PlansPage() {
  const [session, h] = await Promise.all([
    getServerSession(authOptions),
    headers(),
  ]);
  const sub = h.get("x-tenant-subdomain")!;
  const tenantId = session!.user.tenants?.[sub]?.tenantId as string;
  const roles = (session!.user.tenants?.[sub]?.roles ?? []) as TenantRole[];

  if (!canAccess("plans", roles)) redirect("/admin");

  const plans = await db.membershipPlan.findMany({
    where: { tenantId },
    include: {
      prices: {
        where: { isActive: true },
        orderBy: [{ interval: "asc" }, { intervalCount: "asc" }],
      },
      _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const plansData = plans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    isActive: p.isActive,
    activeSubscriptions: p._count.subscriptions,
    prices: p.prices.map((pr) => ({
      id: pr.id,
      interval: pr.interval,
      intervalCount: pr.intervalCount,
      amountCents: pr.amountCents,
      currency: pr.currency,
    })),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Planes de membresía</h1>
      <PlansView initialPlans={plansData} />
    </div>
  );
}
