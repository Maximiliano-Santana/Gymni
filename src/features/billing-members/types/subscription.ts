import { z } from "zod";

export const CreateMemberSubscriptionSchema = z.object({
  tenantUserId: z.string().min(1, "Miembro obligatorio"),
  planId: z.string().min(1, "Plan obligatorio"),
  priceId: z.string().min(1, "Precio obligatorio"),
});

export type CreateMemberSubscriptionDTO = z.infer<typeof CreateMemberSubscriptionSchema>;

export const CancelMemberSubscriptionSchema = z.object({
  reason: z.string().max(200).optional(),
});

export type CancelMemberSubscriptionDTO = z.infer<typeof CancelMemberSubscriptionSchema>;
