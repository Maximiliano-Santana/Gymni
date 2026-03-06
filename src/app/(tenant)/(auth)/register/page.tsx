import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import RegisterForm from "@/features/auth/components/RegisterForm";
import { validateTenantSubdomain } from "@/features/tenants/lib";
import { getTenantSettings } from "@/features/tenants/types/settings";

export default async function RegisterPage() {
  const tenant = await validateTenantSubdomain();
  const settings = tenant ? getTenantSettings(tenant) : null;
  const logoUrl = settings?.assets?.logo?.light;

  return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          {logoUrl && (
            <img src={logoUrl} alt={tenant?.name ?? "Logo"} className="h-12 object-contain mx-auto" />
          )}
          <CardTitle className="text-center">Register</CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterForm tenantId={tenant?.id} tenant={tenant} />
        </CardContent>
      </Card>
  );
}
