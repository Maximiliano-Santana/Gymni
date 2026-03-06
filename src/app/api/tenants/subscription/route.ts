import { NextResponse } from "next/server";
import { requireTenantRoles, validateRequest } from "../../lib/validation";
import {
  CreateSubscriptionSchema,
  subscriptionDTO,
} from "@/features/billing-platform/types/subscription";
import db from "@/lib/prisma";
import { getSubdomain } from "@/features/tenants/lib";

export async function POST(req: Request) {
  try {
    const isAllowed = await requireTenantRoles(["OWNER"]);
    if (!isAllowed) {
      return NextResponse.json(
        { message: "No tienes permisos para hacer esto." },
        { status: 401 }
      );
    }
    //Validacion del request
    const subscription: subscriptionDTO = await req.json();
    const validation = validateRequest(CreateSubscriptionSchema, subscription);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Parámetro inválidos" },
        { status: 400 }
      );
    }

    //Validación de tenant
    const subdomain = await getSubdomain();
    if (!subdomain) {
      return NextResponse.json(
        { message: "Request sin subdominio en header" },
        { status: 400 }
      );
    }
    const tenant = await db.tenant.findUnique({
      where: {
        subdomain: subdomain,
      },
      select: {
        subdomain: true,
        id: true,
      },
    });
    if (!tenant) {
      return NextResponse.json(
        { message: `Tenant no encontrado por subdominio: ${subdomain}` },
        { status: 400 }
      );
    }

    //Validacion de plan y price
    const planPrice = await db.planPrice.findUnique({
      where: { id: subscription.planPriceId },
      select: {
        id: true,
        planId: true,
        interval: true,
        amountCents: true,
        currency: true,
        isActive: true,
        plan: {
          select: {
            isActive: true,
            code: true,
          },
        },
      },
    });
    if (!planPrice)
      return NextResponse.json(
        { message: "Precio no encontrado" },
        { status: 400 }
      );
    if (!planPrice.isActive)
      return NextResponse.json(
        { message: "Este precio no está disponible" },
        { status: 400 }
      );
    if (!planPrice.plan.isActive)
      return NextResponse.json(
        { message: "Este plan no está disponible" },
        { status: 400 }
      );

    const addDays = (d: Date, n: number) =>
      new Date(d.getTime() + n * 86_400_000);

    const now = new Date();
    const trialDays = 7;
    const graceDays = 3;

    // 1) Trial
    const trialEnd = trialDays > 0 ? addDays(now, trialDays) : now;

    // 2) Inicio y fin del periodo (calendario real)
    const periodStart = trialEnd;
    const currentPeriodEnd = new Date(periodStart);
    if (planPrice.interval === "MONTH") {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    } else {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    }

    const invoiceDueAt = addDays(periodStart, graceDays);

    // 5) Transacción: Subscription (trialing) + Invoice (open)
    try {
      const result = await db.$transaction(async (tx) => {
        const existing = await tx.subscription.findFirst({
          where: {
            tenantId: tenant.id,
          },
          select: { id: true },
        });
        if (existing) throw new Error("SUB_ALREADY_EXISTS");

        const subCreated = await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: planPrice.planId,
            priceId: planPrice.id,
            provider: "MANUAL",
            billingInterval: planPrice.interval,
            trialEnd,
            currentPeriodEnd: currentPeriodEnd,
          },
          select: { id: true },
        });

        const invoice = await tx.invoice.create({
          data: {
            tenantId: tenant.id,
            subscriptionId: subCreated.id,
            amountCents: planPrice.amountCents,
            currency: planPrice.currency,
            status: "open",
            issuedAt: now,
            dueAt: invoiceDueAt,
            planId: planPrice.planId, // snapshots
            priceId: planPrice.id,
          },
          select: {
            id: true,
            status: true,
            dueAt: true,
            amountCents: true,
            currency: true,
          },
        });

        return { subscriptionId: subCreated.id, invoice };
      });

      return NextResponse.json(
        {
          message: "Suscripción creada (trialing)",
          subscriptionId: result.subscriptionId,
          invoice: result.invoice,
          trialEnd,
        },
        { status: 201 }
      );
    } catch (e: any) {
      if (e?.message === "SUB_ALREADY_EXISTS")
        return NextResponse.json(
          { message: "Ya existe suscripción" },
          { status: 409 }
        );
      return NextResponse.json(
        { message: "Error al crear suscripción" },
        { status: 500 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { message: "Ocurió un error al iniciar suscripción", error: err },
      { status: 500 }
    );
  }
}
