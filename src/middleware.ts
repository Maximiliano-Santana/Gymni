// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const isProtected = (p: string) =>
  p.startsWith("/dashboard") || p.startsWith("/admin") || p.startsWith("/app") || p.startsWith("/api/protected");

const isTenantOnly = (p: string) =>
  p.startsWith("/dashboard") || p.startsWith("/admin");

const isPlatformOnly = (p: string) =>
  p.startsWith("/app");

function computeSubdomain(hostname: string): string | null {
  const host = hostname.split(":")[0];

  if (process.env.NODE_ENV === "development") {
    // acme.localhost → "acme"
    if (host.endsWith(".localhost")) return host.slice(0, -".localhost".length);
    // ngrok / cualquier tunnel sin subdominio real → default dev tenant
    if (host.endsWith(".ngrok-free.app") || host.endsWith(".ngrok-free.dev") || host.endsWith(".ngrok.io")) return "dev-gym";
  }

  const parts = host.split(".");
  // Root domain (gymni.com = 2 partes) o www.gymni.com → sin tenant
  if (parts.length <= 2) return null;
  const sub = parts[0];
  return sub === "www" ? null : sub;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Excluye assets
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  ) return NextResponse.next();

  // 1) Tenancy SIEMPRE — prefer Host header (req.nextUrl.hostname can lose subdomain)
  const hostHeader = req.headers.get("host") ?? req.nextUrl.hostname;
  const sub = computeSubdomain(hostHeader);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-subdomain", sub || '');

  // 2) Rutas que no corresponden al dominio actual
  if (!sub && isTenantOnly(pathname)) {
    return NextResponse.redirect(new URL("/app", req.url));
  }
  if (sub && isPlatformOnly(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 3) Subdomain root → redirect based on role (no marketing page on tenant subdomains)
  if (sub && pathname === "/") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
    const tenants = (token.tenants ?? {}) as Record<string, { roles?: string[] }>;
    const roles = tenants[sub]?.roles ?? [];
    const isStaff = roles.some((r) => r === "OWNER" || r === "ADMIN" || r === "STAFF");
    return NextResponse.redirect(new URL(isStaff ? "/admin" : "/dashboard", req.url));
  }

  // 4) Auth SOLO si la ruta es protegida
  if (isProtected(pathname)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = new URL("/login", req.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/", "/:path*"] };
