import { z } from "zod";

export const CheckInLookupSchema = z.object({
  qrToken: z.string().uuid("Token QR inválido"),
});

export const CheckInSearchSchema = z.object({
  query: z.string().min(1, "Búsqueda requerida"),
});

export const CheckInConfirmSchema = z.object({
  tenantUserId: z.string().min(1, "ID de miembro requerido"),
});

export type CheckInMemberInfo = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  status: string;
  subscription: {
    planName: string;
    status: string;
    billingEndsAt: string;
  } | null;
  lastCheckIn: string | null; // ISO date if already checked in today, null otherwise
  warning: string | null;
};
