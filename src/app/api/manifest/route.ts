import { NextRequest } from "next/server";
import db from "@/lib/prisma";
import { getTenantSettings } from "@/features/tenants/types/settings";

export async function GET(request: NextRequest) {
  const headerSub = request.headers.get("x-tenant-subdomain");
  const hostSub = (() => {
    const host = request.headers.get("host")?.split(":")[0];
    if (!host) return null;
    const parts = host.split(".");
    if (parts.length <= 2) return null;
    return parts[0] === "www" ? null : parts[0];
  })();
  const subdomain = headerSub || hostSub;

  // Defaults for root domain / dev
  let name = "Gymni";
  let themeColor = "#7c3aed";
  let backgroundColor = "#09090b";
  let iconUrl = "/dev-gym.svg";

  if (subdomain && subdomain !== "localhost") {
    const tenant = await db.tenant.findUnique({
      where: { subdomain },
      select: { name: true, settings: true },
    });

    if (tenant) {
      name = tenant.name;
      const settings = getTenantSettings(tenant);
      if (settings) {
        themeColor = settings.colors.primary;
        backgroundColor = settings.mode === "dark" ? "#09090b" : "#ffffff";
        iconUrl =
          settings.assets?.favicon ||
          settings.assets?.logo?.dark ||
          settings.assets?.logo?.light ||
          "/dev-gym.svg";
      }
    }
  }

  const manifest = {
    name,
    short_name: name,
    start_url: "/",
    display: "standalone" as const,
    theme_color: themeColor,
    background_color: backgroundColor,
    icons: [
      ...(iconUrl.endsWith(".svg")
        ? [
            { src: iconUrl, sizes: "any", type: "image/svg+xml", purpose: "any" },
            { src: iconUrl, sizes: "any", type: "image/svg+xml", purpose: "maskable" },
          ]
        : [
            { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "any" },
            { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "maskable" },
          ]),
    ],
    shortcuts: [
      {
        name: "Mi QR",
        short_name: "QR",
        url: "/dashboard/qr",
        icons: [],
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=0, must-revalidate",
      Vary: "Host",
    },
  });
}
