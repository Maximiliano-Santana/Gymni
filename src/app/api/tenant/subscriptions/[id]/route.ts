import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../../lib/validation";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN"]);
    const { id } = await params;

    const sub = await db.memberSubscription.findFirst({
      where: { id, tenantId, status: { not: "CANCELED" } },
    });
    if (!sub) {
      return NextResponse.json({ message: "Suscripción no encontrada" }, { status: 404 });
    }

    const updated = await db.memberSubscription.update({
      where: { id },
      data: { status: "CANCELED", canceledAt: new Date() },
      include: { plan: { select: { name: true } } },
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al cancelar suscripción" }, { status: 400 });
  }
}
