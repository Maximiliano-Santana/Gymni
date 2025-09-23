// app/providers.tsx
"use client";
import { TenantProvider } from "@/features/tenant/providers/tenant-context";
import { SessionProvider } from "next-auth/react";

export function Providers({
  children,
  tenant
}: {
  children: React.ReactNode,
  tenant: any
}) {
  return (
    <SessionProvider>
      <TenantProvider value={tenant}>
      { children }

      </TenantProvider>
    </SessionProvider>
  );
}
