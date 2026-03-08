import { NextResponse } from "next/server";
import { requireTenantRoles, validateRequest } from "../../lib/validation";
import {
  CreatePaymenSchema,
  CreatePaymentDTO,
} from "@/features/billing-platform/types/payment";
import db from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    //Validacion de permisos y campos para registrar pago
    const isAllowed = await requireTenantRoles(["OWNER"]);
    if (!isAllowed) {
      return Response.json(
        { message: "No tienes permisos para hacer esto" },
        { status: 401 }
      );
    }

    const payment: CreatePaymentDTO = await req.json();
    const validation = validateRequest(CreatePaymenSchema, payment);
    if (!validation.success)
      return NextResponse.json(
        { message: validation.message },
        { status: 400 }
      );

    // Use tenantId from JWT, not body
    //Validación de suscripción activa
    const subscription = await db.subscription.findFirst({
      where: {
        tenantId: isAllowed.tenantId,
        status: "active",
      },
      select: {
        id: true,
        tenantId: true,
        invoices: {
            where: {
                status: "open"
            },
            select: {
                id: true,
                payments: true,
                amountCents: true,
            }
        }
      }
    });

    if (!subscription) return NextResponse.json({message: "No existe una suscripción activa para este gimnasio"}, {status:400});
    if (!subscription.invoices[0]) return NextResponse.json({message: "No existen facturas pendientes para este gimnasio"}, {status:400});
    
    const result = await db.$transaction(async (tx) => {
        const invoice = subscription.invoices[0];

        const paidAt = payment.paidAt ?? new Date();
        const newPayment = await tx.payment.create({
          data: {
            tenantId: subscription.tenantId,
            invoiceId: invoice.id,
            amountCents: payment.amountCents,
            method: payment.method,
            paidAt: paidAt,
          },
        });

        let previousPayments = 0;
        invoice.payments.forEach((payment) => {
          previousPayments += payment.amountCents;
        });

        const remainingAmount = invoice.amountCents - newPayment.amountCents;
        await tx.invoice.update({
          where: {
            id: newPayment.invoiceId,
          },
          data: {
            amountCents: remainingAmount,
            status: remainingAmount <= 0 ? "paid" : "open",
          },
        });

        return { remaining: remainingAmount }

    });

    return NextResponse.json(
      { message: `Pago registrado correctamente. Pendiente de pago:${result.remaining}` },
      { status: 200 }
    );
  } catch (e: any) {
    if (e.code === "P2025") {
      return NextResponse.json(
        { message: "No hay factura abierta para este tenant." },
        { status: 404 }
      );
    }
    if (e.code === "P2002") {
      return NextResponse.json(
        { message: "Pago duplicado (referencia única violada)." },
        { status: 409 }
      );
    }
    console.error("[payment]", e);
    return NextResponse.json(
      { message: "Error al registrar pago." },
      { status: 400 }
    );
  }
}
