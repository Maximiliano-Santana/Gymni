// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // ✅ Manejar localhost:3000 correctamente
  const subdomain = hostname.split('.')[0].split(':')[0]; // Remover puerto
  
  console.log(`🚀 Middleware: ${hostname} → ${subdomain}`);
  
  // En desarrollo, localhost no es un subdomain válido
  if (process.env.NODE_ENV === 'development' && subdomain === 'localhost') {
    console.log(`Set mocked dev-gym`)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-subdomain', 'dev-gym'); 
    
    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  }
  
  // Producción: validar subdomain real
  if (!subdomain || subdomain === 'www') {
    return NextResponse.redirect(new URL('/not-found', request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-subdomain', subdomain);
  
  return NextResponse.next({
    request: { headers: requestHeaders }
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};