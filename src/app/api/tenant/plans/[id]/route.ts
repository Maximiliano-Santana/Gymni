import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../../lib/validation";
import { UpdateMembershipPlanSchema } from "@/features/billing-members/types/plan";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);
    const { id } = await params;

    const plan = await db.membershipPlan.findFirst({
      where: { id, tenantId },
      include: {
        prices: { orderBy: [{ interval: "asc" }, { intervalCount: "asc" }] },
        _count: {
          select: {
            subscriptions: { where: { status: "ACTIVE" } },
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ message: "Plan no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        isActive: plan.isActive,
        activeSubscriptions: plan._count.subscriptions,
        prices: plan.prices.map((pr) => ({
          id: pr.id,
          interval: pr.interval,
          intervalCount: pr.intervalCount,
          amountCents: pr.amountCents,
          currency: pr.currency,
          isActive: pr.isActive,
        })),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al obtener plan" }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER"]);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = UpdateMembershipPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: `Parámetros inválidos: ${parsed.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 }
      );
    }

    const plan = await db.membershipPlan.findFirst({ where: { id, tenantId } });
    if (!plan) {
      return NextResponse.json({ message: "Plan no encontrado" }, { status: 404 });
    }

    const updated = await db.membershipPlan.update({
      where: { id },
      data: parsed.data,
      include: { prices: { where: { isActive: true } } },
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al actualizar plan" }, { status: 400 });
  }
}
