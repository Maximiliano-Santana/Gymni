import z, { success } from "zod";

export function validateRequest<T>(schema: z.ZodSchema<T>, body: any) {
  const { success, error, data } = schema.safeParse(body);

  if (!success && error) {
    const message = error.issues
      .map((i) => `${i.path.join(".") || "form"}: ${i.message}`)
      .join(", ");

    return {
      success: false,
      message: `Parámetros inválidos: ${message}`,
    };
  }

  return { success: true, data };
}

import { NextRequest } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import db from "@/lib/prisma";
import { TenantRole } from "@prisma/client";
import { getSubdomain } from "@/features/tenants/lib";

export async function validateSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, message: "Sesion no encontrada" };
  if (session.user.systemRole !== "SUPER_ADMIN")
    return {
      success: false,
      message: "No tienes permisos para realizar esta acción",
    };
  return { success: true, message: "Validación correcta" };
}

export async function validateTenantAdmin(tenantId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, message: "Sesion no encontrada" };
  const tenantUser = await db.tenantUser.findUnique({
    where: {
      userId_tenantId: { userId: session.user.id, tenantId },
    },
  });
  if (!tenantUser)
    return { success: false, message: "Usuario no asignado al Gym" };

  const isAllowed = tenantUser.roles?.some(
    (r) => r === "OWNER" || r === "ADMIN"
  );
  if (isAllowed) {
    return { success: true, message: "Usuario autorizado" };
  } else {
    return { success: false, message: "Usuario no autorizado" };
  }
}

export async function validateTenantStaff(tenantId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, message: "Sesion no encontrada" };
  const tenantUser = await db.tenantUser.findUnique({
    where: {
      userId_tenantId: { userId: session.user.id, tenantId },
    },
  });
  if (!tenantUser)
    return { success: false, message: "Usuario no asignado al Gym" };

  const isAllowed = tenantUser.roles?.some((r) => r === "STAFF");
  if (isAllowed) {
    return { success: true, message: "Usuario autorizado" };
  } else {
    return { success: false, message: "Usuario no autorizado" };
  }
}

export async function requireTenantRoles(
  needed: TenantRole[]
) {
  const sub = await getSubdomain();
  if (!sub) throw new Error("401"); // sin contexto de tenant

  const s = await getServerSession(authOptions);
  if (!s) throw new Error("401");

  // Obtener info de tenant desde el token para evitar consultar BD
  const info = (s.user as any).tenants?.[sub];

  // SUPER_ADMIN: aún requiere que el subdominio exista en su mapa si la ruta necesita contexto
  if (s.user.systemRole === "SUPER_ADMIN") {
    if (!info) throw new Error("403_FORBIDDEN");
    const roles: TenantRole[] = (info as any)?.roles || [];
    const tenantId: string | undefined = (info as any)?.tenantId;
    if (!tenantId) throw new Error("403_FORBIDDEN");
    return { tenantId, subdomain: sub, roles } as { tenantId: string; subdomain: string; roles: TenantRole[] };
  }

  // Usuarios no super: validar roles requeridos
  const roles: TenantRole[] = (info as any)?.roles || [];
  const ok = roles.some((r: TenantRole) => needed.includes(r));
  if (!ok) throw new Error("403_FORBIDDEN");

  const tenantId: string | undefined = (info as any)?.tenantId;
  if (!tenantId) throw new Error("403_FORBIDDEN");

  return { tenantId, subdomain: sub, roles } as { tenantId: string; subdomain: string; roles: TenantRole[] };
}
