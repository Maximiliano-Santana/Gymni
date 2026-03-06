import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Providers } from "../providers";
import { headers } from "next/headers";
import { getTenantBySubdomain, validateTenantSubdomain } from "@/features/tenants/lib";
import { getTenantSettings } from "@/features/tenants/types/settings";

export const viewport: Viewport = {
  viewportFit: "cover",
};

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
  const sub = h.get("x-tenant-subdomain") ?? h.get("host")?.split(".")[0] ?? "";

  const tenant = await getTenantBySubdomain(sub);
  const settings = tenant ? getTenantSettings(tenant) : null;

  return {
    title: tenant?.name || "Gym&i",
    description: "El mejor software para tu gimnasio.",
    icons: {
      icon: settings?.assets?.favicon || "/vercel.svg"
    }
  }
}

export default async function TenantLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenant = await validateTenantSubdomain();

  const settings = tenant ? getTenantSettings(tenant) : null;
  const isDark = settings?.mode === "dark";

  return (
    <html lang="en" className={isDark ? "dark" : ""}>
      <head>
        <link rel="stylesheet" href="/api/tenants/theme" precedence="high" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers tenant={tenant}>{children}</Providers>
      </body>
    </html>
  );
}
