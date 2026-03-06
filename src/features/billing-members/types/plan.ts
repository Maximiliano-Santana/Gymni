import { BillingInterval } from "@prisma/client";
import { z } from "zod";

export const CreateMembershipPlanSchema = z.object({
  code: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[A-Z0-9_]+$/, "Solo mayúsculas, números y guion bajo"),
  name: z.string().min(1, "Nombre obligatorio").max(60),
  description: z.string().max(200).optional(),
  prices: z
    .array(
      z.object({
        interval: z.nativeEnum(BillingInterval),
        intervalCount: z.number().int().min(1).max(12),
        amountCents: z.number().int().min(0),
        currency: z.string().default("MXN"),
      })
    )
    .min(1, "Al menos un precio"),
});

export type CreateMembershipPlanDTO = z.infer<typeof CreateMembershipPlanSchema>;

export const UpdateMembershipPlanSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
  prices: z
    .array(
      z.object({
        id: z.string().optional(),
        interval: z.nativeEnum(BillingInterval),
        intervalCount: z.number().int().min(1).max(12),
        amountCents: z.number().int().min(0),
        currency: z.string().default("MXN"),
      })
    )
    .optional(),
});

export type UpdateMembershipPlanDTO = z.infer<typeof UpdateMembershipPlanSchema>;

export const CreateMembershipPriceSchema = z.object({
  interval: z.nativeEnum(BillingInterval),
  intervalCount: z.number().int().min(1).max(12),
  amountCents: z.number().int().min(0),
  currency: z.string().default("MXN"),
});

export type CreateMembershipPriceDTO = z.infer<typeof CreateMembershipPriceSchema>;
