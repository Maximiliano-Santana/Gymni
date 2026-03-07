"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import type { PaymentListItem, PaymentMethodFilter, PaymentStats } from "@/features/billing-members/types/payment-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
import { DatePicker } from "@/components/ui/date-picker";
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

function getToday(tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function getMondayOfWeek(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getMonthStart(dateStr: string) {
  return dateStr.slice(0, 7) + "-01";
}

function getLastMonthRange(dateStr: string) {
  const [y, m] = dateStr.split("-").map(Number);
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  const lastDay = new Date(prevYear, prevMonth, 0).getDate();
  return {
    from: `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`,
    to: `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

type Preset = { label: string; getRange: (today: string) => { from: string; to: string } };

const PRESETS: Preset[] = [
  { label: "Hoy", getRange: (today) => ({ from: today, to: today }) },
  { label: "Semana", getRange: (today) => ({ from: getMondayOfWeek(today), to: today }) },
  { label: "Mes", getRange: (today) => ({ from: getMonthStart(today), to: today }) },
  { label: "Mes pasado", getRange: (today) => getLastMonthRange(today) },
];

const chartConfig: ChartConfig = {
  totalCents: {
    label: "Ingresos",
    color: "var(--chart-1)",
  },
};

export default function PaymentsTable({
  payments,
  total,
  totalCents,
  page,
  totalPages,
  initialSearch,
  initialMethod,
  initialFrom = "",
  initialTo = "",
  stats = null,
  tz = "America/Mexico_City",
  canManage = false,
}: {
  payments: PaymentListItem[];
  total: number;
  totalCents: number;
  page: number;
  totalPages: number;
  initialSearch: string;
  initialMethod: PaymentMethodFilter;
  initialFrom?: string;
  initialTo?: string;
  stats?: PaymentStats | null;
  tz?: string;
  canManage?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(initialSearch);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);

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

  function handlePreset(preset: Preset) {
    const today = getToday(tz);
    const range = preset.getRange(today);
    setFromDate(range.from);
    setToDate(range.to);
    router.push(buildUrl({ from: range.from, to: range.to, page: undefined }));
  }

  function handleDateApply() {
    router.push(buildUrl({ from: fromDate || undefined, to: toDate || undefined, page: undefined }));
  }

  function handleClearDates() {
    setFromDate("");
    setToDate("");
    router.push(buildUrl({ from: undefined, to: undefined, page: undefined }));
  }

  function activePresetLabel(): string | null {
    const today = getToday(tz);
    for (const preset of PRESETS) {
      const range = preset.getRange(today);
      if (range.from === initialFrom && range.to === initialTo) return preset.label;
    }
    return null;
  }

  const currentPreset = activePresetLabel();
  const hasDateFilter = !!initialFrom && !!initialTo;
  const statsTotalCents = stats?.byMethod.reduce((sum, m) => sum + m.totalCents, 0) ?? 0;

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
      {/* Date presets + custom range */}
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant={currentPreset === preset.label ? "default" : "outline"}
              size="sm"
              onClick={() => handlePreset(preset)}
              className="w-full sm:w-auto"
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
          <div>
            <Label className="text-xs text-muted-foreground">Desde</Label>
            <DatePicker
              value={fromDate}
              onChange={(v) => setFromDate(v)}
              placeholder="Desde"
              className="sm:w-36"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Hasta</Label>
            <DatePicker
              value={toDate}
              onChange={(v) => setToDate(v)}
              placeholder="Hasta"
              className="sm:w-36"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDateApply}
            disabled={!fromDate || !toDate}
            className="w-full sm:w-auto"
          >
            Aplicar
          </Button>
          {hasDateFilter && (
            <Button variant="ghost" size="sm" onClick={handleClearDates} className="w-full sm:w-auto">
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards + chart — only when date filter is active */}
      {hasDateFilter && stats && (
        <>
          <div className="grid gap-2 grid-cols-2 sm:gap-3 sm:grid-cols-4">
            <Card className="py-0">
              <CardContent className="px-3 py-2 sm:px-4 sm:py-3">
                <p className="text-[11px] text-muted-foreground sm:text-xs">Total</p>
                <p className="text-lg font-bold sm:text-2xl">{formatMoney(statsTotalCents)}</p>
              </CardContent>
            </Card>
            {stats.byMethod.map((m) => (
              <Card key={m.method} className="py-0">
                <CardContent className="px-3 py-2 sm:px-4 sm:py-3">
                  <p className="text-[11px] text-muted-foreground sm:text-xs">
                    {METHOD_LABELS[m.method] ?? m.method}
                  </p>
                  <p className="text-lg font-bold sm:text-2xl">{formatMoney(m.totalCents)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {stats.byDay.length > 1 && (
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos diarios</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <BarChart data={stats.byDay.map((d) => ({ ...d, totalCents: d.totalCents / 100 }))}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v: string) => {
                        const [, m, d] = v.split("-");
                        return `${parseInt(d)}/${parseInt(m)}`;
                      }}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                      tick={{ fontSize: 12 }}
                      width={70}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => formatMoney(Number(value) * 100)}
                        />
                      }
                    />
                    <Bar dataKey="totalCents" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

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
            <SelectTrigger className="w-36 sm:w-44">
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
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Fecha</TableHead>
              <TableHead className="whitespace-nowrap">Miembro</TableHead>
              <TableHead className="whitespace-nowrap">Plan</TableHead>
              <TableHead className="whitespace-nowrap">Monto</TableHead>
              <TableHead className="whitespace-nowrap">Método</TableHead>
              <TableHead className="whitespace-nowrap">Referencia</TableHead>
              <TableHead className="whitespace-nowrap">Registrado por</TableHead>
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
                    <TableCell className="whitespace-nowrap">
                      {formatTenantDate(p.paidAt, tz)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium whitespace-nowrap">{p.memberName ?? "—"}</p>
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
                    <TableCell className="whitespace-nowrap">{METHOD_LABELS[p.method] ?? p.method}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {p.reference ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
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
              <DatePicker
                value={editDate}
                onChange={(v) => setEditDate(v)}
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
