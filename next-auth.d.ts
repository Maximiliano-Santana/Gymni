// types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";
import type { TenantsMap, TenantRole } from "./auth"; // ← tus tipos del paso 1

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      systemRole: "USER" | "SUPER_ADMIN";
      tenants?: TenantsMap;             // 👈 mapa por subdominio
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
    tenants?: TenantsMap;               // 👈 mismo mapa en el token
  }
}
