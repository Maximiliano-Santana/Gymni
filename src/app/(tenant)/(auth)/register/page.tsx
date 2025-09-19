import { headers } from "next/headers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import RegisterForm from "@/features/auth/components/RegisterForm";
import db from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain");
  let tenant

  if (subdomain) {
    tenant = await db.tenant.findUnique({
      where: {
        subdomain: subdomain,
      },
    });
    if (tenant == null) {
      redirect(`/tenant/cta?subdomain=${subdomain}`);
    }
  }

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
