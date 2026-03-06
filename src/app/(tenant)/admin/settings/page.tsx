import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
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
  const colors = (settings.colors as Record<string, string>) ?? {};
  const layout = (settings.layout as Record<string, Record<string, string>>) ?? {};
  const billing = (settings.billing as Record<string, number>) ?? {};
  const assets = (settings.assets as Record<string, unknown>) ?? {};
  const logo = assets.logo as { light?: string; dark?: string } | undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <SettingsForm
        initialData={{
          name: tenant.name,
          address: tenant.address,
          mode: (settings.mode as string) ?? "light",
          primaryColor: colors.primary ?? "#e86c00",
          grayBase: colors.grayBase ?? "#545454",
          successColor: colors.success ?? "#2db224",
          warningColor: colors.warning ?? "#eb7b7b",
          borderRadius: layout.borderRadius?.base ?? "0.5rem",
          graceDays: billing.graceDays ?? 0,
          autoCancelDays: billing.autoCancelDays ?? 0,
          logoUrl: logo?.light ?? null,
          faviconUrl: (assets.favicon as string) ?? null,
        }}
      />
    </div>
  );
}
