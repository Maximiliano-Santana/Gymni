import db from "@/lib/prisma";
import type { TenantRole } from "@prisma/client";
type TenantsMap = Record<string, TenantRole[]>;

export async function getTenantsBySubdomain(userId: string): Promise<TenantsMap> {
  const rows = await db.tenantUser.findMany({
    where: { userId },
    select: { roles: true, tenant: { select: { subdomain: true } } },
  });

  const map: TenantsMap = {};
  for (const r of rows) {
    map[r.tenant.subdomain] = r.roles as TenantRole[];
  }
  return map;
}
