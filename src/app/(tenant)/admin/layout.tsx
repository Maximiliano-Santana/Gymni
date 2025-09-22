import type { ReactNode } from "react";
export default async function TenantAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
