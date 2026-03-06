import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getSubdomain } from "@/features/tenants/lib";
import { canAccess } from "@/features/admin/lib/permissions";
import type { TenantRole } from "@prisma/client";
import CheckInScreen from "@/features/admin/components/CheckInScreen";

export default async function CheckInPage() {
  const [session, sub] = await Promise.all([
    getServerSession(authOptions),
    getSubdomain(),
  ]);
  const subdomain = sub ?? "";
  const roles = (session!.user.tenants?.[subdomain]?.roles ?? []) as TenantRole[];

  if (!canAccess("checkin", roles)) redirect("/admin");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Check-in</h1>
      <CheckInScreen />
    </div>
  );
}
