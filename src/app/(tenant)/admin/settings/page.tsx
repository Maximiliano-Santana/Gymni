import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import db from "@/lib/prisma";
import { canAccess } from "@/features/admin/lib/permissions";
import type { TenantRole } from "@prisma/client";
import SettingsForm from "@/features/admin/components/SettingsForm";

export default async function SettingsPage() {
  const [session, h] = await Promise.all([
    getServerSession(authOptions),
    headers(),
  ]);
  const sub = h.get("x-tenant-subdomain")!;
  const tenantId = session!.user.tenants?.[sub]?.tenantId as string;
  const roles = (session!.user.tenants?.[sub]?.roles ?? []) as TenantRole[];

  if (!canAccess("settings", roles)) redirect("/admin");

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, address: true, settings: true },
  });

  if (!tenant) redirect("/admin");

  const settings = (tenant.settings as Record<string, unknown>) ?? {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <SettingsForm
        initialData={{
          name: tenant.name,
          address: tenant.address,
          mode: (settings.mode as string) ?? "light",
          primaryColor: ((settings.colors as Record<string, string>)?.primary) ?? "#f97316",
        }}
      />
    </div>
  );
}
