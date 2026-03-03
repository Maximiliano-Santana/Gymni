import type { TenantRole } from "@prisma/client";

/** Roles that grant access to tenant admin/staff routes. */
export const STAFF_ROLES: TenantRole[] = ["OWNER", "ADMIN", "STAFF"];

export function isStaffRole(roles: TenantRole[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r));
}
