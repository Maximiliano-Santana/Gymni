import { NextResponse } from "next/server";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../lib/validation";
import { CreateMemberSubscriptionSchema } from "@/features/billing-members/types/subscription";
import { getTenantSettings } from "@/features/tenants/types/settings";

export async function POST(request: Request) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);

    const body = await request.json().catch(() => ({}));
    const parsed = CreateMemberSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: `Parámetros inválidos: ${parsed.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 }
      );
    }

    const { tenantUserId, planId, priceId, billingStartDate } = parsed.data;

    // Validate member belongs to tenant
    const member = await db.tenantUser.findFirst({
      where: { id: tenantUserId, tenantId },
    });
    if (!member) {
      return NextResponse.json({ message: "Miembro no encontrado" }, { status: 404 });
    }

    // Validate plan and price belong to tenant
    const price = await db.membershipPrice.findFirst({
      where: { id: priceId, planId, plan: { tenantId, id: planId } },
    });
    if (!price) {
      return NextResponse.json({ message: "Plan o precio no válido" }, { status: 400 });
    }

    // Cancel existing active subscription if any
    await db.memberSubscription.updateMany({
      where: { tenantUserId, tenantId, status: "ACTIVE" },
      data: { status: "CANCELED", canceledAt: new Date() },
    });

    // Calculate billing end date (use UTC to avoid timezone day-shift)
    const startDate = billingStartDate
      ? new Date(billingStartDate + "T00:00:00Z")
      : new Date();
    const billingEndsAt = new Date(startDate);
    if (price.interval === "YEAR") {
      billingEndsAt.setUTCFullYear(billingEndsAt.getUTCFullYear() + price.intervalCount);
    } else {
      billingEndsAt.setUTCMonth(billingEndsAt.getUTCMonth() + price.intervalCount);
    }

    // Get tenant grace days for invoice dueAt
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
    const graceDays = tenant ? getTenantSettings(tenant)?.billing?.graceDays ?? 0 : 0;
    const dueAt = new Date(startDate.getTime() + graceDays * 86_400_000);

    // Create subscription + invoice
    const subscription = await db.memberSubscription.create({
      data: {
        tenantId,
        tenantUserId,
        planId,
        priceId,
        status: "ACTIVE",
        billingEndsAt,
        invoices: {
          create: {
            tenantId,
            amountCents: price.amountCents,
            currency: price.currency,
            status: "open",
            issuedAt: startDate,
            dueAt,
            planId,
            priceId,
          },
        },
      },
      include: { plan: { select: { name: true } }, invoices: true },
    });

    return NextResponse.json({ data: subscription }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al crear suscripción" }, { status: 400 });
  }
}
