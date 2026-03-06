import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getSubdomain } from "@/features/tenants/lib";
import db from "@/lib/prisma";
import { canAccess } from "@/features/admin/lib/permissions";
import type { TenantRole } from "@prisma/client";
import PlansView from "@/features/admin/components/PlansView";

export default async function PlansPage() {
  const [session, sub] = await Promise.all([
    getServerSession(authOptions),
    getSubdomain(),
  ]);
  const subdomain = sub ?? "";
  const tenantId = session!.user.tenants?.[subdomain]?.tenantId as string;
  const roles = (session!.user.tenants?.[subdomain]?.roles ?? []) as TenantRole[];

  if (!canAccess("plans", roles)) redirect("/admin");

  const plans = await db.membershipPlan.findMany({
    where: { tenantId },
    include: {
      prices: {
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
      isActive: pr.isActive,
    })),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Planes de membresía</h1>
      <PlansView initialPlans={plansData} />
    </div>
  );
}
