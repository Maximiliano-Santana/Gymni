import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getSubdomain } from "@/features/tenants/lib";
import { canAccess } from "@/features/admin/lib/permissions";
import type { TenantRole } from "@prisma/client";
import { queryPayments } from "@/features/billing-members/server/queries";
import type { PaymentMethodFilter } from "@/features/billing-members/types/payment-list";
import PaymentsTable from "@/features/admin/components/PaymentsTable";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; method?: string; page?: string }>;
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

  const search = params.search || undefined;
  const method = (params.method as PaymentMethodFilter) || undefined;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const result = await queryPayments({ tenantId, search, method, page });

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
        canManage
      />
    </div>
  );
}
