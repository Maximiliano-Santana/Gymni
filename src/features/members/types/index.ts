import { z } from "zod";

export const AddMemberSchema = z.object({
  email: z.string().email("Correo inválido"),
  name: z.string().min(1, "Nombre obligatorio").max(100),
});

export type AddMemberDTO = z.infer<typeof AddMemberSchema>;

/** Shape returned by GET /api/tenant/members */
export type MemberListItem = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  roles: string[];
  status: string;
  subscription: {
    planName: string;
    status: string;
    billingEndsAt: string;
  } | null;
};

export type MemberStatusFilter = "all" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "sin_plan";

export type PaginatedMembers = {
  data: MemberListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Shape returned by GET /api/tenant/members/[id] */
export type MemberDetail = MemberListItem & {
  joinedAt: string;
  image: string | null;
  qrToken: string | null;
  invoices: {
    id: string;
    amountCents: number;
    currency: string;
    status: string;
    issuedAt: string;
  }[];
  payments: {
    id: string;
    amountCents: number;
    method: string;
    paidAt: string;
    reference: string | null;
  }[];
  checkIns: {
    id: string;
    checkedInAt: string;
    checkedInBy: string | null;
  }[];
};
