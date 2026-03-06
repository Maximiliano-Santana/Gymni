import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getSubdomain } from "@/features/tenants/lib";
import db from "@/lib/prisma";
import { canAccess } from "@/features/admin/lib/permissions";
import type { TenantRole } from "@prisma/client";
import PaymentsTable from "@/features/admin/components/PaymentsTable";

export default async function PaymentsPage() {
  const [session, sub] = await Promise.all([
    getServerSession(authOptions),
    getSubdomain(),
  ]);
  const subdomain = sub ?? "";
  const tenantId = session!.user.tenants?.[subdomain]?.tenantId as string;
  const roles = (session!.user.tenants?.[subdomain]?.roles ?? []) as TenantRole[];

  if (!canAccess("payments", roles)) redirect("/admin");

  const payments = await db.memberPayment.findMany({
    where: { tenantId },
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
    take: 100,
  });

  const paymentsData = payments.map((p) => ({
    id: p.id,
    paidAt: p.paidAt.toISOString(),
    amountCents: p.amountCents,
    method: p.method,
    reference: p.reference,
    memberName: p.invoice.subscription.tenantUser.user.name,
    memberEmail: p.invoice.subscription.tenantUser.user.email,
    planName: p.invoice.subscription.plan.name,
    invoiceStatus: p.invoice.status,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pagos</h1>
      <PaymentsTable payments={paymentsData} />
    </div>
  );
}
