import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function TenantMemberLayout({
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
  if (!tenantInfo) redirect("/login");

  return <>{children}</>;
}
