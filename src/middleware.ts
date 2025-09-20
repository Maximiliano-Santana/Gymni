// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const isProtected = (p: string) =>
  p.startsWith("/dashboard") || p.startsWith("/api/protected");

function computeSubdomain(hostname: string) {
  const host = hostname.split(":")[0];
  const sub = host.split(".")[0];
  if (
    process.env.NODE_ENV === "development" &&
    (sub === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host))
  ) return "dev-gym";
  return sub && sub !== "www" ? sub : null;
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
