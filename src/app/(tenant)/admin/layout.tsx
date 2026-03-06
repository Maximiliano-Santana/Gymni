import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { isStaffRole } from "@/features/auth/lib";
import { getSubdomain } from "@/features/tenants/lib";
import type { TenantRole } from "@prisma/client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AdminSidebar from "@/features/admin/components/AdminSidebar";
import AdminHeader from "@/features/admin/components/AdminHeader";

export default async function TenantAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [session, sub] = await Promise.all([
    getServerSession(authOptions),
    getSubdomain(),
  ]);

  if (!session) redirect("/login");
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
