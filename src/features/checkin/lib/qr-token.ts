import { randomUUID } from "crypto";

export function generateQrToken(): string {
  return randomUUID();
}
