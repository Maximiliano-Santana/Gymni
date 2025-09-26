import { BillingProvider } from "@prisma/client";
import z from "zod";

export const CreateSubscriptionSchema = z.object({
    planPriceId: z.string().nonempty("Plan es obligatorio"),
})

export type subscriptionDTO = z.infer<typeof CreateSubscriptionSchema>