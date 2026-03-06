import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import MembersTable from "@/features/admin/components/MembersTable";
import { getSubdomain } from "@/features/tenants/lib";
import { queryMembers } from "@/features/members/server/queries";
import type { MemberStatusFilter } from "@/features/members/types";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const [session, sub, params] = await Promise.all([
    getServerSession(authOptions),
    getSubdomain(),
    searchParams,
  ]);
  const subdomain = sub ?? "";
  const tenantId = session!.user.tenants?.[subdomain]?.tenantId as string;

  const search = params.search || undefined;
  const status = (params.status as MemberStatusFilter) || undefined;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const result = await queryMembers({ tenantId, search, status, page });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Miembros</h1>
      <MembersTable
        members={result.data}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        initialSearch={search ?? ""}
        initialStatus={status ?? "all"}
      />
    </div>
  );
}
