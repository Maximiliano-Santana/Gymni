import db from "@/lib/prisma";
import { NextResponse } from "next/server";

// Handle GET requests
export async function GET(request: Request) {
  const tenants = await db.tenant.findMany();
  return NextResponse.json(tenants);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // crear tenant en la DB
    const tenant = await db.tenant.create({
      data: {
        name: body.name,
        subdomain: body.subdomain,
        branding: body.branding
      },
    });

    return NextResponse.json({ message: "Tenant creado", tenant });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "No se pudo crear el tenant" },
      { status: 500 }
    );
  }
}