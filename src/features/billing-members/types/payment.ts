import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

export const CreateMemberPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Factura obligatoria"),
  method: z.nativeEnum(PaymentMethod),
  amountCents: z.number().int().min(1, "Monto debe ser mayor a 0"),
  paidAt: z.coerce.date().optional(),
  reference: z.string().trim().max(100).optional(),
});

export type CreateMemberPaymentDTO = z.infer<typeof CreateMemberPaymentSchema>;

export const VoidPaymentSchema = z.object({
  reason: z.string().trim().min(1, "Motivo obligatorio").max(200),
});

export const EditPaymentSchema = z.object({
  method: z.nativeEnum(PaymentMethod).optional(),
  amountCents: z.number().int().min(1).optional(),
  paidAt: z.coerce.date().optional(),
  reference: z.string().trim().max(100).optional().nullable(),
});
