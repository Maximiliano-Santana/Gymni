import { NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../lib/validation";
import { CreateMembershipPlanSchema } from "@/features/billing-members/types/plan";

export async function GET() {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);

    const plans = await db.membershipPlan.findMany({
      where: { tenantId },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: [{ interval: "asc" }, { intervalCount: "asc" }],
        },
        _count: {
          select: {
            subscriptions: { where: { status: "ACTIVE" } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const data = plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      isActive: p.isActive,
      activeSubscriptions: p._count.subscriptions,
      prices: p.prices.map((pr) => ({
        id: pr.id,
        interval: pr.interval,
        intervalCount: pr.intervalCount,
        amountCents: pr.amountCents,
        currency: pr.currency,
      })),
    }));

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al obtener planes" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER"]);

    const body = await request.json().catch(() => ({}));
    const parsed = CreateMembershipPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: `Parámetros inválidos: ${parsed.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 }
      );
    }

    const { code, name, description, prices } = parsed.data;

    // Check unique code within tenant
    const existing = await db.membershipPlan.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (existing) {
      return NextResponse.json({ message: `Ya existe un plan con código "${code}"` }, { status: 409 });
    }

    const plan = await db.membershipPlan.create({
      data: {
        tenantId,
        code,
        name,
        description,
        prices: {
          create: prices.map((p) => ({
            interval: p.interval,
            intervalCount: p.intervalCount,
            amountCents: p.amountCents,
            currency: p.currency,
          })),
        },
      },
      include: { prices: true },
    });

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al crear plan" }, { status: 400 });
  }
}
