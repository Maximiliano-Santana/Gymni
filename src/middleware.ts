// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

function tenantMiddleware(req: NextRequest) {
  const hostname = req.headers.get("host") || "";
  const subdomain = hostname.split(".")[0].split(":")[0];

  const requestHeaders = new Headers(req.headers);

  if (process.env.NODE_ENV === "development" && subdomain === "localhost") {
    requestHeaders.set("x-tenant-subdomain", "dev-gym");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!subdomain || subdomain === "www") {
    return NextResponse.redirect(new URL("/not-found", req.url));
  }

  requestHeaders.set("x-tenant-subdomain", subdomain);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

// Wrap con NextAuth (protege rutas)
export default withAuth(
  function middleware(req) {
    
    return tenantMiddleware(req);
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // 🔒 require sesión para rutas protegidas
    },
  }
);

// Config matcher: decide qué rutas llevan auth + multi-tenant
export const config = {
  matcher: [
    "/dashboard/:path*",  // 🔒 dashboard protegido
  ],
};
