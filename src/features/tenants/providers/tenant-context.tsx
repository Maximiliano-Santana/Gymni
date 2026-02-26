// tenant-context.tsx
"use client";
import { createContext, useContext } from "react";

type Tenant = {
  id: string;
  name: string;
  subdomain: string;
  theme?: any;
  settings?: any;
};

// El contexto puede ser null si aún no hay tenant
const TenantContext = createContext<Tenant | null>(null);

// Provider: envuelve tus componentes
export function TenantProvider({ value, children }: { value: Tenant; children: React.ReactNode }) {
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

// Hook para consumir el tenant desde cualquier componente cliente
export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant debe usarse dentro de <TenantProvider>");
  return ctx;
}
