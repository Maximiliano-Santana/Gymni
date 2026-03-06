import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import db from "@/lib/prisma";
import { requireTenantRoles } from "../../lib/validation";
import { CreateMemberPaymentSchema } from "@/features/billing-members/types/payment";

export async function POST(request: Request) {
  try {
    const { tenantId } = await requireTenantRoles(["OWNER", "ADMIN", "STAFF"]);

    const body = await request.json().catch(() => ({}));
    const parsed = CreateMemberPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: `Parámetros inválidos: ${parsed.error.issues.map((i) => i.message).join(", ")}` },
        { status: 400 }
      );
    }

    const { invoiceId, method, amountCents, paidAt, reference } = parsed.data;

    // Get staff name for receivedBy
    const session = await getServerSession(authOptions);
    const staffName = session?.user?.name ?? session?.user?.email ?? null;

    // Validate invoice belongs to tenant
    const invoice = await db.memberInvoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { subscription: true },
    });
    if (!invoice) {
      return NextResponse.json({ message: "Factura no encontrada" }, { status: 404 });
    }
    if (invoice.status === "paid") {
      return NextResponse.json({ message: "Esta factura ya está pagada" }, { status: 409 });
    }

    // Create payment + mark invoice paid in transaction
    const payment = await db.$transaction(async (tx) => {
      const p = await tx.memberPayment.create({
        data: {
          tenantId,
          invoiceId,
          method,
          amountCents,
          paidAt: paidAt ?? new Date(),
          reference,
          receivedBy: staffName,
        },
      });

      // Check if fully paid (exclude voided)
      const totalPaid = await tx.memberPayment.aggregate({
        where: { invoiceId, voidedAt: null },
        _sum: { amountCents: true },
      });

      if ((totalPaid._sum.amountCents ?? 0) >= invoice.amountCents) {
        await tx.memberInvoice.update({
          where: { id: invoiceId },
          data: { status: "paid" },
        });

        // Reactivate subscription if it was PAST_DUE
        if (invoice.subscription.status === "PAST_DUE") {
          // Extend billing period from previous billingEndsAt (not from today)
          const price = await tx.membershipPrice.findUnique({
            where: { id: invoice.priceId },
          });
          if (price) {
            const newEnd = new Date(invoice.subscription.billingEndsAt);
            if (price.interval === "YEAR") {
              newEnd.setUTCFullYear(newEnd.getUTCFullYear() + price.intervalCount);
            } else {
              newEnd.setUTCMonth(newEnd.getUTCMonth() + price.intervalCount);
            }
            await tx.memberSubscription.update({
              where: { id: invoice.subscriptionId },
              data: { status: "ACTIVE", billingEndsAt: newEnd },
            });
          }
        }
      }

      return p;
    });

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "403_FORBIDDEN")
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    return NextResponse.json({ message: "Error al registrar pago" }, { status: 400 });
  }
}
