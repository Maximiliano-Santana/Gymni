import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import db from "@/lib/prisma";
import LoginForm from "@/features/auth/components/LoginForm";

export default async function LoginPage() {
  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain") || "dev-gym";

  const tenant = await db.tenant.findUnique({
    where: {
      subdomain: subdomain,
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm tenantId={tenant?.id} />
        </CardContent>
      </Card>
    </>
  );
}
