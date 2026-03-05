import { NextRequest, NextResponse } from 'next/server'
import { getTenantSettings } from '../../../../features/tenants/types/settings';
import { generateETag, generateTenantCSS, getDefaultCSS } from '@/features/tenants/server/theme';
import db from '../../../../lib/prisma';


export async function GET(request: NextRequest) {
  try {
    // Query param ?tenant= permite forzar un tenant (útil para theme preview)
    const tenantParam = request.nextUrl.searchParams.get('tenant');
    const tenantSubdomain = tenantParam || request.headers.get('x-tenant-subdomain');

    // Caso 1: Desarrollo o sin tenant (landing page)
    if (!tenantSubdomain || tenantSubdomain === 'localhost') {
      const defaultCSS = getDefaultCSS();
      return new Response(defaultCSS, {
        headers: {
          'Content-Type': 'text/css; charset=utf-8',
          'Cache-Control': 'public, max-age=3600', // 1 hora para desarrollo
          'ETag': '"default-theme"',
        },
      });
    }

    // Caso 2: Buscar tenant real
    const tenant = await db.tenant.findUnique({
      where: { subdomain: tenantSubdomain },
      select: {
        id: true,
        subdomain: true,
        settings: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      // Tenant no encontrado, usar CSS por defecto
      const defaultCSS = getDefaultCSS();
      return new Response(defaultCSS, {
        headers: {
          'Content-Type': 'text/css; charset=utf-8',
          'Cache-Control': 'public, max-age=300', // 5 minutos para no encontrados
          'ETag': '"not-found-theme"',
        },
      });
    }

    // Caso 3: Tenant encontrado, generar CSS personalizado
    const themeManifest = getTenantSettings(tenant);
    const css = generateTenantCSS(themeManifest);
    const etag = generateETag(tenant.id, tenant.updatedAt);

    // Check cache con ETag
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { 
        status: 304,
        headers: {
          'ETag': etag,
        }
      });
    }

    return new Response(css, {
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'ETag': etag,
        'Vary': 'Host', // Cache por hostname
      },
    });

  } catch (error) {
    console.error('Error generating theme CSS:', error);
    
    // Fallback robusto
    const fallbackCSS = getDefaultCSS();
    return new Response(fallbackCSS, {
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Error': 'theme-generation-failed',
      },
    });
  }
}