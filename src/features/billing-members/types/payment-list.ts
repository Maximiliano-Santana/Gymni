export type PaymentMethodFilter = "all" | "CASH" | "TRANSFER" | "CARD" | "OTHER";

export type PaymentListItem = {
  id: string;
  paidAt: string;
  amountCents: number;
  method: string;
  reference: string | null;
  receivedBy: string | null;
  memberName: string | null;
  memberEmail: string;
  planName: string;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
};

export type PaginatedPayments = {
  data: PaymentListItem[];
  total: number;
  totalCents: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
