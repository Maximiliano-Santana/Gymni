import db from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Tenant } from "@prisma/client";

export async function validateTenantSubdomain(): Promise<Tenant | null> {
  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain");
  let tenant: Tenant | null = null;

  if (subdomain) {
    tenant = await db.tenant.findUnique({
      where: { subdomain },
    });
  }

  return tenant;
}
