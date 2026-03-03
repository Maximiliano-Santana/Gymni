import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import db from "@/lib/prisma";
import MemberDetail from "@/features/admin/components/MemberDetail";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, h] = await Promise.all([
    getServerSession(authOptions),
    headers(),
  ]);
  const sub = h.get("x-tenant-subdomain")!;
  const tenantId = session!.user.tenants?.[sub]?.tenantId as string;
  const roles = session!.user.tenants?.[sub]?.roles ?? [];

  const tu = await db.tenantUser.findFirst({
    where: { id, tenantId, roles: { has: "MEMBER" } },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      memberSubscriptions: {
        orderBy: { createdAt: "desc" },
        include: {
          plan: { select: { id: true, name: true } },
          price: { select: { id: true, interval: true, intervalCount: true, amountCents: true, currency: true } },
          invoices: {
            orderBy: { issuedAt: "desc" },
            take: 20,
            include: { payments: { orderBy: { paidAt: "desc" } } },
          },
        },
      },
    },
  });

  if (!tu) notFound();

  const activeSub = tu.memberSubscriptions.find((s) => s.status !== "CANCELED") ?? null;
  const allInvoices = tu.memberSubscriptions.flatMap((s) => s.invoices);
  const allPayments = allInvoices.flatMap((inv) => inv.payments);

  // Fetch available plans for assignment dialog
  const plans = await db.membershipPlan.findMany({
    where: { tenantId, isActive: true },
    include: {
      prices: { where: { isActive: true }, orderBy: [{ interval: "asc" }, { intervalCount: "asc" }] },
    },
  });

  const member = {
    id: tu.id,
    userId: tu.userId,
    name: tu.user.name,
    email: tu.user.email,
    roles: tu.roles as string[],
    status: tu.status,
    joinedAt: tu.user.createdAt.toISOString(),
    subscription: activeSub
      ? {
          id: activeSub.id,
          planName: activeSub.plan.name,
          status: activeSub.status,
          billingEndsAt: activeSub.billingEndsAt.toISOString(),
        }
      : null,
    invoices: allInvoices.map((inv) => ({
      id: inv.id,
      amountCents: inv.amountCents,
      currency: inv.currency,
      status: inv.status,
      issuedAt: inv.issuedAt.toISOString(),
    })),
    payments: allPayments.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      method: p.method,
      paidAt: p.paidAt.toISOString(),
      reference: p.reference,
    })),
  };

  const plansData = plans.map((p) => ({
    id: p.id,
    name: p.name,
    prices: p.prices.map((pr) => ({
      id: pr.id,
      interval: pr.interval,
      intervalCount: pr.intervalCount,
      amountCents: pr.amountCents,
      currency: pr.currency,
    })),
  }));

  return (
    <MemberDetail member={member} plans={plansData} userRoles={roles as string[]} />
  );
}
