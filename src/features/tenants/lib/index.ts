import db from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Tenant } from "@prisma/client";
import type { TenantTyped } from "@/features/tenants/types/settings";

// Cache por request — si generateMetadata y TenantLayout llaman con el mismo
// subdomain, Prisma ejecuta una sola query por request.
export const getTenantBySubdomain = cache(async (subdomain: string): Promise<Tenant | null> => {
  return db.tenant.findUnique({ where: { subdomain } });
});

function extractSubdomainFromHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");
  if (parts.length <= 2) return null;
  const sub = parts[0];
  return sub === "www" ? null : sub;
}

export async function validateTenantSubdomain(): Promise<TenantTyped | null> {
  const headerList = await headers();
  const subdomain =
    headerList.get("x-tenant-subdomain") ||
    extractSubdomainFromHost(headerList.get("host"));

  // Sin subdomain = dominio raíz = páginas de marketing, no necesita tenant
  if (!subdomain) return null;

  const tenant = await getTenantBySubdomain(subdomain);

  // Subdomain inválido → página de error en lugar de null silencioso
  if (!tenant) redirect("/tenant-notfound");

  return tenant as TenantTyped;
}
