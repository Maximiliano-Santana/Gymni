// app/tenant/classes/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../lib/validation";
import { z } from "zod";
import type { TenantRole } from "@prisma/client";
import { STAFF_ROLES } from "@/features/auth/lib";

export async function GET(request: Request) {
  try {
    // Requiere que el usuario sea OWNER (puedes agregar "ADMIN" si aplica)
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN"]);

    // Obtener TenantUsers que NO tengan el rol MEMBER
    const staff = await db.tenantUser.findMany({
      where: {
        tenantId,
        NOT: { roles: { has: "MEMBER" } },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({ data: staff }, { status: 200 });
  } catch (error: any) {
    if (error.message === "403_FORBIDDEN")
      return NextResponse.json(
        { message: "No tienes permisos para hacer esto" },
        { status: 403 }
      );
    return NextResponse.json(
      { message: "Ocurrió un error al obtener los usuarios" },
      { status: 400 }
    );
  }
}

// DELETE: remover usuarios del staff (elimina OWNER/ADMIN/STAFF, conserva otros roles como MEMBER)
export async function DELETE(request: Request) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN"]);

    const body = await request.json().catch(() => undefined);

    // Acepta: ["tu_1", "tu_2"] o { ids: ["tu_1", "tu_2"] }
    const IdArraySchema = z.array(z.string().min(1)).min(1);
    const Schema = z.union([
      IdArraySchema,
      z.object({ ids: IdArraySchema }).transform((o) => o.ids),
    ]);

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json(
        { message: `Parámetros inválidos: ${msg}` },
        { status: 400 }
      );
    }

    const ids = parsed.data as string[];


    const results = await db.$transaction(async (tx) => {
      // Obtener registros del tenant
      const rows = await tx.tenantUser.findMany({
        where: { id: { in: ids }, tenantId },
        select: { id: true, roles: true },
      });

      if (rows.length !== ids.length) throw new Error("NOT_FOUND_OR_FORBIDDEN");

      // Quitar roles de staff
      for (const r of rows) {
        const newRoles = (r.roles as TenantRole[]).filter((x) => !STAFF_ROLES.includes(x));
        await tx.tenantUser.update({ where: { id: r.id }, data: { roles: newRoles } });
      }

      // Devolver staff actualizado
      const staff = await tx.tenantUser.findMany({
        where: { tenantId, NOT: { roles: { has: "MEMBER" } } },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      return staff;
    });

    return NextResponse.json({ data: results }, { status: 200 });
  } catch (error: any) {
    if (error.message === "403_FORBIDDEN")
      return NextResponse.json(
        { message: "No tienes permisos para hacer esto" },
        { status: 403 }
      );
    if (error.message === "NOT_FOUND_OR_FORBIDDEN")
      return NextResponse.json(
        { message: "Alguno de los registros no existe o no pertenece a este tenant" },
        { status: 400 }
      );
    return NextResponse.json(
      { message: "Ocurrió un error al remover del staff" },
      { status: 400 }
    );
  }
}
// PATCH: actualiza roles de múltiples TenantUser (OWNER/ADMIN/STAFF), excluyendo MEMBER
export async function PATCH(request: Request) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN"]);

    const body = await request.json().catch(() => ({}));

    const ChangeSchema = z.object({
      tenantUserId: z.string().min(1),
      roles: z.array(z.enum(["OWNER", "ADMIN", "STAFF"]).nullable().transform((v) => v ?? undefined) as any).optional(),
    });
    // Normaliza roles: si viene null, úsalo como []
    const NormalizedChangeSchema = z.object({
      tenantUserId: z.string().min(1),
      roles: z.array(z.enum(["OWNER", "ADMIN", "STAFF"]))
        .max(3)
        .default([]),
    });

    const Schema = z
      .array(ChangeSchema)
      .min(1)
      .transform((arr) =>
        arr.map((c) =>
          NormalizedChangeSchema.parse({ tenantUserId: c.tenantUserId, roles: (c as any).roles ?? [] })
        )
      );

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json(
        { message: `Parámetros inválidos: ${msg}` },
        { status: 400 }
      );
    }

    const changes = parsed.data as { tenantUserId: string; roles: TenantRole[] }[];

    const results = await db.$transaction(async (tx) => {
      for (const ch of changes) {
        const updated = await tx.tenantUser.updateMany({
          where: { id: ch.tenantUserId, tenantId },
          data: { roles: ch.roles as TenantRole[] },
        });
        if (updated.count === 0) {
          throw new Error("NOT_FOUND_OR_FORBIDDEN");
        }
      }

      const staff = await tx.tenantUser.findMany({
        where: { tenantId, NOT: { roles: { has: "MEMBER" } } },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      return staff;
    });

    return NextResponse.json({ data: results }, { status: 200 });
  } catch (error: any) {
    if (error.message === "403_FORBIDDEN") {
      return NextResponse.json(
        { message: "No tienes permisos para hacer esto" },
        { status: 403 }
      );
    }
    if (error.message === "NOT_FOUND_OR_FORBIDDEN") {
      return NextResponse.json(
        { message: "Alguno de los registros no existe o no pertenece a este tenant" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Ocurrió un error al actualizar los roles" },
      { status: 400 }
    );
  }
}
