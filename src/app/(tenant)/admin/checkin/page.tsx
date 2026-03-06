import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { canAccess } from "@/features/admin/lib/permissions";
import type { TenantRole } from "@prisma/client";
import CheckInScreen from "@/features/admin/components/CheckInScreen";

export default async function CheckInPage() {
  const [session, h] = await Promise.all([
    getServerSession(authOptions),
    headers(),
  ]);
  const sub = h.get("x-tenant-subdomain")!;
  const roles = (session!.user.tenants?.[sub]?.roles ?? []) as TenantRole[];

  if (!canAccess("checkin", roles)) redirect("/admin");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Check-in</h1>
      <CheckInScreen />
    </div>
  );
}
