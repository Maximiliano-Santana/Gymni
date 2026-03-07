import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

/** Parse a "YYYY-MM-DD" string to noon UTC so it never shifts day across timezones */
function dateStringToNoonUTC(val: unknown): Date | undefined {
  if (!val || typeof val !== "string") return undefined;
  const [y, m, d] = val.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export const CreateMemberPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Factura obligatoria"),
  method: z.nativeEnum(PaymentMethod),
  amountCents: z.number().int().min(1, "Monto debe ser mayor a 0"),
  paidAt: z.string().optional().transform(dateStringToNoonUTC),
  reference: z.string().trim().max(100).optional(),
});

export type CreateMemberPaymentDTO = z.infer<typeof CreateMemberPaymentSchema>;

export const VoidPaymentSchema = z.object({
  reason: z.string().trim().min(1, "Motivo obligatorio").max(200),
});

export const EditPaymentSchema = z.object({
  method: z.nativeEnum(PaymentMethod).optional(),
  amountCents: z.number().int().min(1).optional(),
  paidAt: z.string().optional().transform(dateStringToNoonUTC),
  reference: z.string().trim().max(100).optional().nullable(),
});
