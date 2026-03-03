// app/providers.tsx
"use client";
import { TenantProvider } from "@/features/tenants/providers/tenant-context";
import { SessionProvider } from "next-auth/react";
import type { TenantTyped } from "@/features/tenants/types/settings";

export function Providers({
  children,
  tenant
}: {
  children: React.ReactNode,
  tenant: TenantTyped | null
}) {
  return (
    <SessionProvider>
      <TenantProvider value={tenant}>
      { children }

      </TenantProvider>
    </SessionProvider>
  );
}
