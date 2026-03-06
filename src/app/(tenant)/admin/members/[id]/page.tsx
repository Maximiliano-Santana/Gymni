import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { notFound } from "next/navigation";
import { getSubdomain } from "@/features/tenants/lib";
import db from "@/lib/prisma";
import MemberDetail from "@/features/admin/components/MemberDetail";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, sub] = await Promise.all([
    getServerSession(authOptions),
    getSubdomain(),
  ]);
  const subdomain = sub ?? "";
  const tenantId = session!.user.tenants?.[subdomain]?.tenantId as string;
  const roles = session!.user.tenants?.[subdomain]?.roles ?? [];

  const tu = await db.tenantUser.findFirst({
    where: { id, tenantId, roles: { has: "MEMBER" } },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
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
      checkIns: {
        orderBy: { checkedInAt: "desc" },
        take: 50,
      },
    },
  });

  if (!tu) notFound();

  const activeSub = tu.memberSubscriptions.find((s) => s.status !== "CANCELED") ?? null;
  const allPayments = tu.memberSubscriptions
    .flatMap((s) => s.invoices)
    .flatMap((inv) => inv.payments);

  // Fetch available plans for assignment dialog
  const plans = await db.membershipPlan.findMany({
    where: { tenantId, isActive: true },
    include: {
      prices: { where: { isActive: true }, orderBy: [{ interval: "asc" }, { intervalCount: "asc" }] },
    },
  });

  // Resolve staff names for check-ins
  const staffIds = [...new Set(tu.checkIns.map((c) => c.checkedInBy).filter(Boolean))] as string[];
  const staffMap = new Map<string, string>();
  if (staffIds.length > 0) {
    const staffUsers = await db.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, name: true, email: true },
    });
    for (const u of staffUsers) {
      staffMap.set(u.id, u.name ?? u.email);
    }
  }

  const member = {
    id: tu.id,
    userId: tu.userId,
    name: tu.user.name,
    email: tu.user.email,
    image: tu.user.image,
    roles: tu.roles as string[],
    status: tu.status,
    qrToken: tu.qrToken,
    joinedAt: tu.user.createdAt.toISOString(),
    subscription: activeSub
      ? {
          id: activeSub.id,
          planName: activeSub.plan.name,
          status: activeSub.status,
          billingEndsAt: activeSub.billingEndsAt.toISOString(),
        }
      : null,
    subscriptions: tu.memberSubscriptions.map((s) => {
      const openInvoice = s.invoices.find((inv) => inv.status === "open") ?? null;
      const paidCents = openInvoice
        ? openInvoice.payments.reduce((sum, p) => sum + p.amountCents, 0)
        : 0;
      return {
        id: s.id,
        planName: s.plan.name,
        status: s.status,
        billingEndsAt: s.billingEndsAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        amountCents: s.price.amountCents,
        currency: s.price.currency,
        intervalLabel: `${s.price.interval === "YEAR" ? (s.price.intervalCount === 1 ? "Anual" : `${s.price.intervalCount} años`) : s.price.intervalCount === 1 ? "Mensual" : s.price.intervalCount === 3 ? "Trimestral" : s.price.intervalCount === 4 ? "Cuatrimestral" : s.price.intervalCount === 6 ? "Semestral" : `${s.price.intervalCount} meses`}`,
        openInvoice: openInvoice
          ? {
              id: openInvoice.id,
              amountCents: openInvoice.amountCents,
              balanceCents: openInvoice.amountCents - paidCents,
              currency: openInvoice.currency,
            }
          : null,
      };
    }),
    payments: allPayments.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      method: p.method,
      paidAt: p.paidAt.toISOString(),
      reference: p.reference,
      receivedBy: p.receivedBy,
    })),
    checkIns: tu.checkIns.map((c) => ({
      id: c.id,
      checkedInAt: c.checkedInAt.toISOString(),
      checkedInBy: c.checkedInBy ? (staffMap.get(c.checkedInBy) ?? null) : null,
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
