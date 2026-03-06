import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { validateTenantSubdomain } from "@/features/tenants/lib";
import { getTenantSettings } from "@/features/tenants/types/settings";
import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const tenant = await validateTenantSubdomain();
  const settings = tenant ? getTenantSettings(tenant) : null;
  const logoUrl = settings?.assets?.logo?.light;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        {logoUrl && (
          <img src={logoUrl} alt={tenant?.name ?? "Logo"} className="h-12 object-contain mx-auto" />
        )}
        <CardTitle className="text-center">Recuperar contraseña</CardTitle>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
