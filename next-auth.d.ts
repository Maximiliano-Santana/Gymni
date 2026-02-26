// types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";
import type { TenantRole } from "@prisma/client";

type TenantsMap = Record<string, { tenantId: string; roles: TenantRole[] }>; // subdomain -> info
type TenantsRolesMap = Record<string, TenantRole[]>; // subdomain -> roles (compat)

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      systemRole: "USER" | "SUPER_ADMIN";      // 👈 subdominio -> roles[] (compatibilidad)
      tenants?: TenantsMap;     // 👈 subdominio -> { tenantId, roles }
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    systemRole: "USER" | "SUPER_ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    systemRole?: "USER" | "SUPER_ADMIN";
    tenants?: TenantsMap;           // 👈 subdominio -> { tenantId, roles }
  }
}
