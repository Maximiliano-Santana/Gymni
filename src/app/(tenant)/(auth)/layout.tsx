import React from "react";
import { validateTenantSubdomain } from "@/features/tenants/lib";
import { getTenantSettings } from "@/features/tenants/types/settings";
import AuthBrandingPanel from "@/features/auth/components/AuthBrandingPanel";
import { Dumbbell } from "lucide-react";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await validateTenantSubdomain();
  const settings = tenant ? getTenantSettings(tenant) : null;
  const logoUrl = settings?.assets?.logo?.light;
  const tenantName = tenant?.name ?? "Gymni";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Branding panel — desktop only */}
      <AuthBrandingPanel tenantName={tenantName} logoUrl={logoUrl} />

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={tenantName}
              className="h-8 object-contain"
            />
          ) : (
            <Dumbbell className="h-8 w-8 text-primary" />
          )}
          <span className="text-lg font-semibold">{tenantName}</span>
        </div>

        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
