import { PaymentMethod } from "@prisma/client";
import z from "zod";

export const RegisterPaymenSchema = z
  .object({
    tenantId: z.string(),
    method: z.nativeEnum(PaymentMethod),
    amountCents: z.number().int(),
    paidAt: z.coerce.date().optional(),
    reference: z.string().trim().optional(),
  })

export type RegisterPaymentDTO = z.infer<typeof RegisterPaymenSchema>;
