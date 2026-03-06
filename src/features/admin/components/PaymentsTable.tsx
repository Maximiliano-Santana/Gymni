"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { PaymentListItem, PaymentMethodFilter } from "@/features/billing-members/types/payment-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, Search, MoreHorizontal, Pencil, Ban } from "lucide-react";
import { useTenant } from "@/features/tenants/providers/tenant-context";
import { getTenantSettings } from "@/features/tenants/types/settings";
import { formatTenantDate } from "@/lib/timezone";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  OTHER: "Otro",
};

const METHOD_OPTIONS: { value: PaymentMethodFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "CASH", label: "Efectivo" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CARD", label: "Tarjeta" },
  { value: "OTHER", label: "Otro" },
];

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}

export default function PaymentsTable({
  payments,
  total,
  totalCents,
  page,
  totalPages,
  initialSearch,
  initialMethod,
  canManage = false,
}: {
  payments: PaymentListItem[];
  total: number;
  totalCents: number;
  page: number;
  totalPages: number;
  initialSearch: string;
  initialMethod: PaymentMethodFilter;
  canManage?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenant = useTenant();
  const tz = getTenantSettings(tenant)?.timezone ?? "America/Mexico_City";

  const [search, setSearch] = useState(initialSearch);

  // Void dialog state
  const [voidPayment, setVoidPayment] = useState<PaymentListItem | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState("");

  // Edit dialog state
  const [editPayment, setEditPayment] = useState<PaymentListItem | null>(null);
  const [editMethod, setEditMethod] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editRef, setEditRef] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  const buildUrl = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(overrides)) {
        if (value && value !== "" && value !== "all" && value !== "1") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, searchParams]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== initialSearch) {
        router.push(buildUrl({ search: search || undefined, page: undefined }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMethodChange(value: string) {
    router.push(buildUrl({ method: value, page: undefined }));
  }

  function handlePage(newPage: number) {
    router.push(buildUrl({ page: String(newPage) }));
  }

  function openEdit(p: PaymentListItem) {
    setEditPayment(p);
    setEditMethod(p.method);
    setEditAmount((p.amountCents / 100).toFixed(2));
    setEditDate(p.paidAt.slice(0, 10));
    setEditRef(p.reference ?? "");
    setEditError("");
  }

  function openVoid(p: PaymentListItem) {
    setVoidPayment(p);
    setVoidReason("");
    setVoidError("");
  }

  async function handleVoid() {
    if (!voidPayment) return;
    setVoidError("");
    setVoiding(true);
    try {
      const res = await fetch(`/api/tenant/payments/${voidPayment.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        setVoidError(data.message ?? "Error al anular");
        return;
      }
      setVoidPayment(null);
      router.refresh();
    } finally {
      setVoiding(false);
    }
  }

  async function handleEdit() {
    if (!editPayment) return;
    setEditError("");
    setEditing(true);
    try {
      const updates: Record<string, unknown> = {};
      const newAmountCents = Math.round(parseFloat(editAmount) * 100);
      if (editMethod !== editPayment.method) updates.method = editMethod;
      if (newAmountCents !== editPayment.amountCents) updates.amountCents = newAmountCents;
      if (editDate !== editPayment.paidAt.slice(0, 10)) updates.paidAt = editDate;
      if (editRef !== (editPayment.reference ?? "")) updates.reference = editRef || null;

      if (Object.keys(updates).length === 0) {
        setEditPayment(null);
        return;
      }

      const res = await fetch(`/api/tenant/payments/${editPayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.message ?? "Error al editar");
        return;
      }
      setEditPayment(null);
      router.refresh();
    } finally {
      setEditing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, correo, referencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={initialMethod} onValueChange={handleMethodChange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            Total: <span className="font-semibold text-foreground">{formatMoney(totalCents)}</span>
            {" "}({total} {total === 1 ? "pago" : "pagos"})
          </p>
        </div>
      </div>

      {/* Table */}
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
              <TableHead>Registrado por</TableHead>
              {canManage && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 8 : 7} className="text-center text-muted-foreground py-8">
                  No se encontraron pagos
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => {
                const isVoided = !!p.voidedAt;
                return (
                  <TableRow key={p.id} className={isVoided ? "opacity-50" : ""}>
                    <TableCell>
                      {formatTenantDate(p.paidAt, tz)}
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
                    <TableCell>
                      <div>
                        <span className={`font-medium ${isVoided ? "line-through" : ""}`}>
                          {formatMoney(p.amountCents)}
                        </span>
                        {isVoided && (
                          <div className="mt-0.5">
                            <Badge variant="destructive" className="text-[10px] px-1 py-0">Anulado</Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {p.voidReason} — {p.voidedBy}
                            </p>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{METHOD_LABELS[p.method] ?? p.method}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.reference ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.receivedBy ?? "—"}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" disabled={isVoided}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(p)}>
                              <Pencil className="size-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => openVoid(p)}
                            >
                              <Ban className="size-4 mr-2" />
                              Anular
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => handlePage(page - 1)}
          >
            <ChevronLeft className="mr-1 size-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => handlePage(page + 1)}
          >
            Siguiente
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      )}

      {/* Void dialog */}
      <Dialog open={!!voidPayment} onOpenChange={(open) => { if (!open) setVoidPayment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular pago</DialogTitle>
            <DialogDescription>
              {voidPayment && (
                <>
                  Pago de {formatMoney(voidPayment.amountCents)} a {voidPayment.memberName ?? voidPayment.memberEmail}.
                  Si la factura ya estaba pagada, se reabrirá.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo de anulación</Label>
              <Textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Ej: Pago duplicado, error de monto..."
                maxLength={200}
              />
            </div>
            {voidError && <p className="text-sm text-destructive">{voidError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidPayment(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={voiding || !voidReason.trim()}
            >
              {voiding ? "Anulando..." : "Anular pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editPayment} onOpenChange={(open) => { if (!open) setEditPayment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar pago</DialogTitle>
            <DialogDescription>
              {editPayment && (
                <>Pago a {editPayment.memberName ?? editPayment.memberEmail}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Método</Label>
              <Select value={editMethod} onValueChange={setEditMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="TRANSFER">Transferencia</SelectItem>
                  <SelectItem value="CARD">Tarjeta</SelectItem>
                  <SelectItem value="OTHER">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto (MXN)</Label>
              <Input
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Fecha de pago</Label>
              <Input
                type="date"
                className="max-w-full"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Referencia</Label>
              <Input
                value={editRef}
                onChange={(e) => setEditRef(e.target.value)}
                placeholder="Folio, recibo..."
              />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPayment(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editing || !editAmount}>
              {editing ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
