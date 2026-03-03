import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isStaffRole } from "@/features/auth/lib";
import type { TenantRole } from "@prisma/client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AdminSidebar from "@/features/admin/components/AdminSidebar";
import AdminHeader from "@/features/admin/components/AdminHeader";

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
  const roles: TenantRole[] = (tenantInfo?.roles ?? []) as TenantRole[];
  const hasAccess = isStaffRole(roles);

  if (!hasAccess) redirect("/dashboard");

  return (
    <SidebarProvider>
      <AdminSidebar roles={roles} />
      <SidebarInset>
        <AdminHeader />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
