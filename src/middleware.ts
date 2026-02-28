// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const isProtected = (p: string) =>
  p.startsWith("/dashboard") || p.startsWith("/api/protected");

function computeSubdomain(hostname: string): string | null {
  const host = hostname.split(":")[0];

  // Dev: localhost sin subdominio → dev-gym, acme.localhost → "acme"
  if (process.env.NODE_ENV === "development") {
    if (host.endsWith(".localhost")) return host.slice(0, -".localhost".length);
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
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  ) return NextResponse.next();

  // 1) Tenancy SIEMPRE
  const sub = computeSubdomain(req.headers.get("host") || "");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-subdomain", sub || '');

  // 2) Auth SOLO si la ruta es protegida
  if (isProtected(pathname)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = new URL("/login", req.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/:path*"] };
