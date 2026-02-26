import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoginForm from "@/features/auth/components/LoginForm";
import { validateTenantSubdomain } from "@/features/tenants/lib";
import { Tenant } from "@prisma/client";

export default async function LoginPage() {
  const tenant: Tenant | null = await validateTenantSubdomain();

  return (
    <>
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
