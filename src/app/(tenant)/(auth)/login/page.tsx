import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoginForm from "@/features/auth/components/LoginForm";
import { validateTenantSubdomain } from "@/features/tenant/lib";

export default async function LoginPage() {
  const tenant = await validateTenantSubdomain();

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
          <LoginForm tenantId={tenant?.id} />
        </CardContent>
      </Card>
    </>
  );
}
