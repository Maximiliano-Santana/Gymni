import db from "@/lib/prisma";

export async function getTenantsBySubdomain(userId: string) {
  const rows = await db.tenantUser.findMany({
    where: { userId },
    select: { roles: true, tenant: { select: { subdomain: true } } },
  });
  const map: Record<string, string[]> = {};
  for (const r of rows) map[r.tenant.subdomain] = r.roles;
  return map;
}