import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getSubdomain } from "@/features/tenants/lib";
import db from "@/lib/prisma";
import { canAccess } from "@/features/admin/lib/permissions";
import type { TenantRole } from "@prisma/client";
import StaffTable from "@/features/admin/components/StaffTable";

export default async function StaffPage() {
  const [session, sub] = await Promise.all([
    getServerSession(authOptions),
    getSubdomain(),
  ]);
  const subdomain = sub ?? "";
  const tenantId = session!.user.tenants?.[subdomain]?.tenantId as string;
  const roles = (session!.user.tenants?.[subdomain]?.roles ?? []) as TenantRole[];

  if (!canAccess("staff", roles)) redirect("/admin");

  const staff = await db.tenantUser.findMany({
    where: {
      tenantId,
      roles: { hasSome: ["OWNER", "ADMIN", "STAFF"] },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const staffData = staff.map((s) => ({
    id: s.id,
    userId: s.userId,
    name: s.user.name,
    email: s.user.email,
    roles: s.roles as string[],
    status: s.status,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Staff</h1>
      <StaffTable initialStaff={staffData} userRoles={roles} tenantId={tenantId} />
    </div>
  );
}
