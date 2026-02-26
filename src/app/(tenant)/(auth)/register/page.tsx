import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import RegisterForm from "@/features/auth/components/RegisterForm";
import { validateTenantSubdomain } from "@/features/tenants/lib";

export default async function RegisterPage() {
  const tenant = await validateTenantSubdomain();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            <h1>Register</h1>
            <CardDescription>
              <h2>{tenant?.name || "Gym&i"} </h2>
            </CardDescription>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterForm tenantId={tenant?.id} />
        </CardContent>
      </Card>
    </>
  );
}
