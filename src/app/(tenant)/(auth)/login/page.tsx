import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoginForm from "@/features/auth/components/LoginForm";
import { validateTenantSubdomain } from "@/features/tenants/lib";
import { getTenantSettings } from "@/features/tenants/types/settings";

export default async function LoginPage() {
  const tenant = await validateTenantSubdomain();
  const settings = tenant ? getTenantSettings(tenant) : null;
  const logoUrl = settings?.assets?.logo?.light;

  return (
    <>
      {logoUrl && (
        <img src={logoUrl} alt={tenant?.name ?? "Logo"} className="h-12 object-contain mb-4" />
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Login</CardTitle>
          <CardDescription>
            <h2 className="text-center">{tenant?.name || "Gym&i"} </h2>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm tenant={tenant} />
        </CardContent>
      </Card>
    </>
  );
}
