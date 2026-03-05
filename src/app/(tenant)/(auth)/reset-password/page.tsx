import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { validateTenantSubdomain } from "@/features/tenants/lib";
import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";

export default async function ResetPasswordPage() {
  const tenant = await validateTenantSubdomain();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Nueva contraseña</CardTitle>
        <CardDescription>
          <h2 className="text-center">{tenant?.name || "Gym&i"}</h2>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
