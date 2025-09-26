import db from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireTenantRoles, validateRequest } from "../lib/validation";
import {
  registerTenantDTO,
  RegisterTenantSchema,
} from "@/features/tenant/types";
import { DEFAULT_TENANT_SETTINGS } from "@/features/tenant/lib/default-settings";
import { Prisma } from "@prisma/client";

// Handle GET requests
export async function GET(request: Request) {
  const tenants = await db.tenant.findMany();
  return NextResponse.json(tenants);
}

export async function POST(request: Request) {
  try {
    const isAllowed = await requireTenantRoles([]);
    if (!isAllowed) {
      return Response.json(
        { message: "No tienes permisos para hacer esto" },
        { status: 401 }
      );
    }

    const tenant: registerTenantDTO = await request.json();
    const requestValidation = validateRequest(RegisterTenantSchema, tenant);
    if (!requestValidation.success)
      return NextResponse.json(
        { message: "Parámetros inválidos" },
        { status: 400 }
      );

    //Se valida subdomino unico
    const existingTenant = await db.tenant.findUnique({
      where: {
        subdomain: tenant.subdomain,
      },
    });
    if (existingTenant)
      return NextResponse.json(
        { message: "Este subdominio ya está registrado." },
        { status: 409 }
      );

    const settings = JSON.parse(
      JSON.stringify({
        ...DEFAULT_TENANT_SETTINGS,
        metadata: { ...DEFAULT_TENANT_SETTINGS.metadata, name: tenant.name },
      })
    ) as Prisma.JsonObject;

    await db.tenant.create({
      data: {
        name: tenant.name,
        subdomain: tenant.subdomain,
        address: tenant.address,
        settings: settings,
      },
    });

    return NextResponse.json({ message: "Tenant creada" }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "No se pudo crear el tenant" },
      { status: 500 }
    );
  }
}
