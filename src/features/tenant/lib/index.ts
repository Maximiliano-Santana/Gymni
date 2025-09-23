import db from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function validateTenantSubdomain() {
  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain");
  let tenant = null;

  if (subdomain) {
    tenant = await db.tenant.findUnique({
      where: {
        subdomain: subdomain,
      },
    });
    if (tenant == null) {
      redirect(`/tenant-notfound?subdomain=${subdomain}`);
    }
  }

  return tenant;
}
