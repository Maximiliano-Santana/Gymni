import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default async function LoginPage() {
  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain") || "dev-gym";

  const tenant = await prisma.tenant.findUnique({
    where: {
      subdomain: subdomain,
    },
  });

  return (
    <>
    <Card>
      <div className="flex justify-center items-center flex-col">
        <div className="w-46 flex flex-col items-center gap-8">
          <h1 className="text-primary bg-accent w-full text-center">
            Hello {tenant?.name}
          </h1>
          <Input type="text" />
          <Input type="text" />
          <Button variant={"default"}>Clickeable</Button>
        </div>
      </div>
    </Card>
    </>
  );
}
