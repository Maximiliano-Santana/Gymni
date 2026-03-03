import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../../lib/validation";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);
    const { id } = await params;

    const tu = await db.tenantUser.findFirst({
      where: { id, tenantId, roles: { has: "MEMBER" } },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
        memberSubscriptions: {
          orderBy: { createdAt: "desc" },
          include: {
            plan: { select: { name: true } },
            invoices: {
              orderBy: { issuedAt: "desc" },
              take: 20,
              include: {
                payments: { orderBy: { paidAt: "desc" } },
              },
            },
          },
        },
      },
    });

    if (!tu) {
      return NextResponse.json({ message: "Miembro no encontrado" }, { status: 404 });
    }

    const activeSub = tu.memberSubscriptions.find((s) => s.status !== "CANCELED") ?? null;
    const allInvoices = tu.memberSubscriptions.flatMap((s) => s.invoices);
    const allPayments = allInvoices.flatMap((inv) => inv.payments);

    const data = {
      id: tu.id,
      userId: tu.userId,
      name: tu.user.name,
      email: tu.user.email,
      roles: tu.roles,
      status: tu.status,
      joinedAt: tu.user.createdAt.toISOString(),
      subscription: activeSub
        ? {
            id: activeSub.id,
            planName: activeSub.plan.name,
            status: activeSub.status,
            billingEndsAt: activeSub.billingEndsAt.toISOString(),
          }
        : null,
      invoices: allInvoices.map((inv) => ({
        id: inv.id,
        amountCents: inv.amountCents,
        currency: inv.currency,
        status: inv.status,
        issuedAt: inv.issuedAt.toISOString(),
      })),
      payments: allPayments.map((p) => ({
        id: p.id,
        amountCents: p.amountCents,
        method: p.method,
        paidAt: p.paidAt.toISOString(),
        reference: p.reference,
      })),
    };

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al obtener detalle del miembro" }, { status: 400 });
  }
}

const PatchSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN"]);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: `Parámetros inválidos: ${parsed.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 }
      );
    }

    const tu = await db.tenantUser.findFirst({ where: { id, tenantId } });
    if (!tu) {
      return NextResponse.json({ message: "Miembro no encontrado" }, { status: 404 });
    }

    const updated = await db.tenantUser.update({
      where: { id },
      data: { ...(parsed.data.status ? { status: parsed.data.status } : {}) },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al actualizar miembro" }, { status: 400 });
  }
}
