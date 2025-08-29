import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import RegisterForm from "@/features/auth/components/RegisterForm";
import db from "@/lib/prisma";

export default async function RegisterPage() {
  // const headerList = await headers();
  // const subdomain = headerList.get("x-tenant-subdomain") || "dev-gym";

  // const tenant = await db.tenant.findUnique({
  //   where: {
  //     subdomain: subdomain,
  //   },
  // });
  const tenant = {name: "Dev-Gym"}

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            <h1>Register</h1>
            <CardDescription>
              <h2>{tenant?.name}</h2>
            </CardDescription>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </>
  );
}
