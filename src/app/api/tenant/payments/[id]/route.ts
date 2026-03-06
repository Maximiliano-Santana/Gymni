import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../../lib/validation";
import {
  VoidPaymentSchema,
  EditPaymentSchema,
} from "@/features/billing-members/types/payment";

// Edit payment
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN"]);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = EditPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: `Parámetros inválidos: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updates = parsed.data;
    if (!updates.method && !updates.amountCents && !updates.paidAt && updates.reference === undefined) {
      return NextResponse.json({ message: "Sin cambios" }, { status: 400 });
    }

    const payment = await db.memberPayment.findFirst({
      where: { id, tenantId },
      include: { invoice: { include: { subscription: true } } },
    });
    if (!payment) {
      return NextResponse.json({ message: "Pago no encontrado" }, { status: 404 });
    }
    if (payment.voidedAt) {
      return NextResponse.json({ message: "No se puede editar un pago anulado" }, { status: 409 });
    }

    const amountChanged = updates.amountCents && updates.amountCents !== payment.amountCents;

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.memberPayment.update({
        where: { id },
        data: {
          ...(updates.method && { method: updates.method }),
          ...(updates.amountCents && { amountCents: updates.amountCents }),
          ...(updates.paidAt && { paidAt: updates.paidAt }),
          ...(updates.reference !== undefined && { reference: updates.reference }),
        },
      });

      if (amountChanged) {
        const agg = await tx.memberPayment.aggregate({
          where: { invoiceId: payment.invoiceId, voidedAt: null },
          _sum: { amountCents: true },
        });
        const totalPaid = agg._sum.amountCents ?? 0;
        const invoice = payment.invoice;
        const sub = invoice.subscription;

        if (totalPaid >= invoice.amountCents && invoice.status !== "paid") {
          await tx.memberInvoice.update({
            where: { id: invoice.id },
            data: { status: "paid" },
          });
          if (sub.status === "PAST_DUE") {
            const price = await tx.membershipPrice.findUnique({
              where: { id: invoice.priceId },
            });
            if (price) {
              const newEnd = new Date(sub.billingEndsAt);
              if (price.interval === "YEAR") {
                newEnd.setUTCFullYear(newEnd.getUTCFullYear() + price.intervalCount);
              } else {
                newEnd.setUTCMonth(newEnd.getUTCMonth() + price.intervalCount);
              }
              await tx.memberSubscription.update({
                where: { id: sub.id },
                data: { status: "ACTIVE", billingEndsAt: newEnd },
              });
            }
          }
        } else if (totalPaid < invoice.amountCents && invoice.status === "paid") {
          await tx.memberInvoice.update({
            where: { id: invoice.id },
            data: { status: "open" },
          });
          if (sub.status === "ACTIVE" && invoice.dueAt && invoice.dueAt <= new Date()) {
            await tx.memberSubscription.update({
              where: { id: sub.id },
              data: { status: "PAST_DUE" },
            });
          }
        }
      }

      return updated;
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al editar pago" }, { status: 400 });
  }
}

// Void payment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN"]);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = VoidPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: `Parámetros inválidos: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const payment = await db.memberPayment.findFirst({
      where: { id, tenantId },
      include: { invoice: { include: { subscription: true } } },
    });
    if (!payment) {
      return NextResponse.json({ message: "Pago no encontrado" }, { status: 404 });
    }
    if (payment.voidedAt) {
      return NextResponse.json({ message: "Este pago ya fue anulado" }, { status: 409 });
    }

    const session = await getServerSession(authOptions);
    const staffName = session?.user?.name ?? session?.user?.email ?? "Desconocido";

    await db.$transaction(async (tx) => {
      // Mark payment as voided
      await tx.memberPayment.update({
        where: { id },
        data: {
          voidedAt: new Date(),
          voidedBy: staffName,
          voidReason: parsed.data.reason,
        },
      });

      // Recalculate total paid (excluding voided)
      const agg = await tx.memberPayment.aggregate({
        where: { invoiceId: payment.invoiceId, voidedAt: null },
        _sum: { amountCents: true },
      });
      const totalPaid = agg._sum.amountCents ?? 0;
      const invoice = payment.invoice;
      const sub = invoice.subscription;

      // If invoice was paid and now underpaid → reopen
      if (invoice.status === "paid" && totalPaid < invoice.amountCents) {
        await tx.memberInvoice.update({
          where: { id: invoice.id },
          data: { status: "open" },
        });

        // If subscription is ACTIVE and past due date → PAST_DUE
        if (sub.status === "ACTIVE" && invoice.dueAt && invoice.dueAt <= new Date()) {
          await tx.memberSubscription.update({
            where: { id: sub.id },
            data: { status: "PAST_DUE" },
          });
        }
      }
    });

    return NextResponse.json({ message: "Pago anulado" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al anular pago" }, { status: 400 });
  }
}
