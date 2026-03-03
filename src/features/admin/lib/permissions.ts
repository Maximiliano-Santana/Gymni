import type { TenantRole } from "@prisma/client";

export const ADMIN_PAGES = {
  dashboard: ["OWNER", "ADMIN", "STAFF"] as TenantRole[],
  members: ["OWNER", "ADMIN", "STAFF"] as TenantRole[],
  payments: ["OWNER", "ADMIN"] as TenantRole[],
  staff: ["OWNER", "ADMIN"] as TenantRole[],
  plans: ["OWNER"] as TenantRole[],
  settings: ["OWNER", "ADMIN"] as TenantRole[],
} as const;

export type AdminPage = keyof typeof ADMIN_PAGES;

export function canAccess(page: AdminPage, roles: TenantRole[]): boolean {
  const allowed = ADMIN_PAGES[page];
  return roles.some((r) => (allowed as readonly TenantRole[]).includes(r));
}
