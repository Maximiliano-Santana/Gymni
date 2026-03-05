import { NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../lib/validation";
import { z } from "zod";

export async function GET() {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, address: true, settings: true, subdomain: true },
    });

    return NextResponse.json({ data: tenant });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al obtener configuración" }, { status: 400 });
  }
}

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(200).optional(),
  settings: z
    .object({
      mode: z.enum(["light", "dark"]).optional(),
      colors: z
        .object({
          primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
          secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
          grayBase: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
          success: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
          warning: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        })
        .optional(),
      layout: z
        .object({
          borderRadius: z.object({ base: z.string().optional() }).optional(),
        })
        .optional(),
      billing: z
        .object({
          graceDays: z.number().int().min(0).max(30).optional(),
          autoCancelDays: z.number().int().min(0).max(365).optional(),
        })
        .optional(),
    })
    .optional(),
});

export async function PATCH(request: Request) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN"]);

    const body = await request.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: `Parámetros inválidos: ${parsed.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 }
      );
    }

    const { name, address, settings } = parsed.data;

    // Merge settings (preserve existing, override provided)
    const current = await db.tenant.findUnique({ where: { id: tenantId } });
    const currentSettings = (current?.settings as Record<string, unknown>) ?? {};

    const mergedSettings = settings
      ? {
          ...currentSettings,
          ...(settings.mode !== undefined ? { mode: settings.mode } : {}),
          colors: {
            ...((currentSettings.colors as Record<string, unknown>) ?? {}),
            ...(settings.colors ?? {}),
          },
          ...(settings.layout !== undefined
            ? {
                layout: {
                  ...((currentSettings.layout as Record<string, unknown>) ?? {}),
                  borderRadius: {
                    ...(((currentSettings.layout as Record<string, unknown>)?.borderRadius as Record<string, unknown>) ?? {}),
                    ...(settings.layout?.borderRadius ?? {}),
                  },
                },
              }
            : {}),
          ...(settings.billing !== undefined
            ? {
                billing: {
                  ...((currentSettings.billing as Record<string, unknown>) ?? {}),
                  ...settings.billing,
                },
              }
            : {}),
        }
      : undefined;

    const tenant = await db.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(mergedSettings !== undefined ? { settings: mergedSettings } : {}),
      },
      select: { id: true, name: true, address: true, settings: true, subdomain: true },
    });

    return NextResponse.json({ data: tenant });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al actualizar configuración" }, { status: 400 });
  }
}
