import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isStaffRole } from "@/features/auth/lib";

export default async function TenantAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [session, h] = await Promise.all([
    getServerSession(authOptions),
    headers(),
  ]);

  if (!session) redirect("/login");

  const sub = h.get("x-tenant-subdomain");
  if (!sub) redirect("/app");

  const tenantInfo = session.user.tenants?.[sub];
  const hasAccess = isStaffRole(tenantInfo?.roles ?? []);

  if (!hasAccess) redirect("/dashboard");

  return <>{children}</>;
}
