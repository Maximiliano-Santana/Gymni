import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getSubdomain } from "@/features/tenants/lib";

export default async function TenantMemberLayout({
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
  if (!tenantInfo) redirect("/login");

  return <>{children}</>;
}
