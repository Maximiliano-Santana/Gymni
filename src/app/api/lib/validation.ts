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
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import db from "@/lib/prisma";

export async function validateSuperAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, message: "Sesion no encontrada" };
  if (session.user.systemRole !== "SUPER_ADMIN")
    return { success: false, message: "No tienes permisos para realizar esta acción" };
  return { success: true, message: "Validación correcta" };
}

export async function validateTenantAdmin(req: NextRequest, tenantId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, message: "Sesion no encontrada" };
  const tenantUser = await db.tenantUser.findUnique({
    where: {
      userId_tenantId: { userId: session.user.id, tenantId: tenantId }
    }
  })
  if(!tenantUser) return { success: false, message: "Usuario no asignado al Gym" }
  
  const isAllowed = [ "OWNER", "ADMIN" ].includes(tenantUser.role)
  if(isAllowed){
    return { success: true, message: "Usuario autorizado" }
  }else{
    return { success: false, message: "Usuario no autorizado" }
  }
}