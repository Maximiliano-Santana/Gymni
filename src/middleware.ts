// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";

const isProtected = (p: string) =>
  p.startsWith("/dashboard") || p.startsWith("/api/protected");

function computeSubdomain(hostname: string) {
  const host = hostname.split(":")[0];
  const sub = host.split(".")[0];
  if (process.env.NODE_ENV === "development" && (sub === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host))) {
    return "dev-gym";
  }
  return sub && sub !== "www" ? sub : null;
}

export default withAuth(
  function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // ❌ Excluir estáticos sin usar lookaheads
    if (
      pathname.startsWith("/_next") ||
      pathname === "/favicon.ico" ||
      /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
    ) {
      return NextResponse.next();
    }

    // ✅ Tenancy siempre
    const sub = computeSubdomain(req.headers.get("host") || "");
    if (!sub) {
      return NextResponse.redirect(new URL("/not-found", req.url));
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-tenant-subdomain", sub);

    return NextResponse.next({ request: { headers: requestHeaders } });
  },
  {
    // Auth solo en rutas protegidas
    callbacks: {
      authorized: ({ req, token }) => (isProtected(req.nextUrl.pathname) ? !!token : true),
    },
    pages: { signIn: "/login" },
  }
);

// ✅ Matcher simple, sin grupos de captura
export const config = {
  matcher: ["/:path*"],
};
