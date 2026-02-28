import db from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Tenant } from "@prisma/client";

export async function validateTenantSubdomain(): Promise<Tenant | null> {
  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain");

  // Sin subdomain = dominio raíz = páginas de marketing, no necesita tenant
  if (!subdomain) return null;

  const tenant = await db.tenant.findUnique({
    where: { subdomain },
  });

  // Subdomain inválido → página de error en lugar de null silencioso
  if (!tenant) redirect("/tenant-notfound");

  return tenant;
}
