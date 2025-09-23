import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Providers } from "../providers";
import { headers } from "next/headers";
import { validateTenantSubdomain } from "@/features/tenant/lib";
import db from "@/lib/prisma";
import { TenantSettings } from "@/features/theme/types/settings";
import type { Tenant } from "@prisma/client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("host") || "";
  const sub = h.get("x-tenant-subdomain") ?? host.split(".")[0];

  const tenant = await db.tenant.findUnique({
    where: { subdomain: sub },
  });
  const settings = tenant?.settings as unknown as TenantSettings | null;

  return {
    title: tenant?.name || "Gym&i",
    description: "El mejor software para tu gimnasio.",
    icons: {
      icon: settings?.assets?.favicon ||"/vercel.svg"
    }
  }
}

export default async function TenantLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenant = await validateTenantSubdomain();

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/api/theme" precedence="high" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers tenant={tenant}>{children}</Providers>
      </body>
    </html>
  );
}
