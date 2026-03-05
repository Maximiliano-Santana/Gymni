import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { validateTenantSubdomain } from "@/features/tenants/lib";
import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const tenant = await validateTenantSubdomain();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Recuperar contraseña</CardTitle>
        <CardDescription>
          <h2 className="text-center">{tenant?.name || "Gym&i"}</h2>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
