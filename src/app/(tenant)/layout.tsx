import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function TenantLayout() {
  // Leer headers
  const headerList = await headers();
  const subdomain = headerList.get("x-tenant-subdomain") || undefined;

  // Validar tenant
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    select: {
      id: true,
      name: true,
      themeManifest: true,
    },
  });

  const theme = tenant?.themeManifest;

  console.log("theme:", theme);

  const css = `
    :root {--color-primary:${"#00FF00"}}
  `;

  if (!tenant) {
    redirect("/not-found");
  }

  return <></>;
}
