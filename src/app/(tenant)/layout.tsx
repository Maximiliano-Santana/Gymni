import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Providers } from "../providers";
import { headers } from "next/headers";
import { getTenantBySubdomain, validateTenantSubdomain } from "@/features/tenants/lib";
import { getTenantSettings } from "@/features/tenants/types/settings";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { InstallBanner } from "@/components/pwa/InstallBanner";

export async function generateViewport(): Promise<Viewport> {
  const h = await headers();
  const sub = h.get("x-tenant-subdomain") ?? h.get("host")?.split(".")[0] ?? "";
  const tenant = await getTenantBySubdomain(sub);
  const settings = tenant ? getTenantSettings(tenant) : null;

  return {
    viewportFit: "cover",
    themeColor: settings?.colors.primary ?? "#7c3aed",
  };
}

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

  const iconUrl = settings?.assets?.favicon || "/vercel.svg";

  return {
    title: tenant?.name || "Gym&i",
    description: "El mejor software para tu gimnasio.",
    manifest: "/api/manifest",
    icons: {
      icon: iconUrl,
      apple: iconUrl,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: tenant?.name || "Gymni",
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
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
        <InstallBanner />
        <Providers tenant={tenant}>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
