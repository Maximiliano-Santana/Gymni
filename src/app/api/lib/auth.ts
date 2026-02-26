import db from "@/lib/prisma";
import type { TenantRole } from "@prisma/client";
type TenantInfo = { tenantId: string; roles: TenantRole[] };
type TenantsMap = Record<string, TenantInfo>; // key: subdomain

export async function getTenantsBySubdomain(userId: string): Promise<TenantsMap> {
  const rows = await db.tenantUser.findMany({
    where: { userId },
    select: { roles: true, tenant: { select: { id: true, subdomain: true } } },
  });

  const map: TenantsMap = {};
  for (const r of rows) {
    map[r.tenant.subdomain] = {
      tenantId: r.tenant.id,
      roles: r.roles as TenantRole[],
    };
  }
  return map;
}
