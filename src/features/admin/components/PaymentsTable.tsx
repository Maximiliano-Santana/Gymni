"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type PaymentRow = {
  id: string;
  paidAt: string;
  amountCents: number;
  method: string;
  reference: string | null;
  memberName: string | null;
  memberEmail: string;
  planName: string;
  invoiceStatus: string;
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  OTHER: "Otro",
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}

export default function PaymentsTable({ payments }: { payments: PaymentRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = payments.filter(
    (p) =>
      (p.memberName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      p.memberEmail.toLowerCase().includes(search.toLowerCase()) ||
      p.planName.toLowerCase().includes(search.toLowerCase()) ||
      (p.reference ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalCents = filtered.reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, correo, plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{formatMoney(totalCents)}</span>
          {" "}({filtered.length} pagos)
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Miembro</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Referencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No se encontraron pagos
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {new Date(p.paidAt).toLocaleDateString("es-MX")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{p.memberName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{p.memberEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.planName}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatMoney(p.amountCents)}
                  </TableCell>
                  <TableCell>{METHOD_LABELS[p.method] ?? p.method}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.reference ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
