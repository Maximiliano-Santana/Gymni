import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getSubdomain } from "@/features/tenants/lib";
import { canAccess } from "@/features/admin/lib/permissions";
import type { TenantRole } from "@prisma/client";
import { queryPayments, queryPaymentStats } from "@/features/billing-members/server/queries";
import type { PaymentMethodFilter } from "@/features/billing-members/types/payment-list";
import PaymentsTable from "@/features/admin/components/PaymentsTable";
import db from "@/lib/prisma";
import { getTenantSettings } from "@/features/tenants/types/settings";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; method?: string; page?: string; from?: string; to?: string }>;
}) {
  const [session, sub, params] = await Promise.all([
    getServerSession(authOptions),
    getSubdomain(),
    searchParams,
  ]);
  const subdomain = sub ?? "";
  const tenantId = session!.user.tenants?.[subdomain]?.tenantId as string;
  const roles = (session!.user.tenants?.[subdomain]?.roles ?? []) as TenantRole[];

  if (!canAccess("payments", roles)) redirect("/admin");

  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
  const tz = getTenantSettings(tenant as { settings: unknown })?.timezone ?? "America/Mexico_City";

  const search = params.search || undefined;
  const method = (params.method as PaymentMethodFilter) || undefined;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const from = params.from || undefined;
  const to = params.to || undefined;

  const [result, stats] = await Promise.all([
    queryPayments({ tenantId, search, method, page, from, to, tz }),
    from && to ? queryPaymentStats({ tenantId, from, to, tz }) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pagos</h1>
      <PaymentsTable
        payments={result.data}
        total={result.total}
        totalCents={result.totalCents}
        page={result.page}
        totalPages={result.totalPages}
        initialSearch={search ?? ""}
        initialMethod={method ?? "all"}
        initialFrom={from ?? ""}
        initialTo={to ?? ""}
        stats={stats}
        tz={tz}
        canManage
      />
    </div>
  );
}
