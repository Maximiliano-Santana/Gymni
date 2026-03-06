"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Camera, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/features/tenants/providers/tenant-context";
import { getTenantSettings } from "@/features/tenants/types/settings";
import { formatTenantDate, formatTenantTime } from "@/lib/timezone";

type PlanOption = {
  id: string;
  name: string;
  prices: {
    id: string;
    interval: string;
    intervalCount: number;
    amountCents: number;
    currency: string;
  }[];
};

type MemberData = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  roles: string[];
  status: string;
  joinedAt: string;
  qrToken: string | null;
  notes: string | null;
  subscription: {
    id: string;
    planName: string;
    status: string;
    billingEndsAt: string;
  } | null;
  subscriptions: {
    id: string;
    planName: string;
    status: string;
    billingEndsAt: string;
    createdAt: string;
    amountCents: number;
    currency: string;
    intervalLabel: string;
    openInvoice: {
      id: string;
      amountCents: number;
      balanceCents: number;
      currency: string;
    } | null;
  }[];
  payments: {
    id: string;
    amountCents: number;
    method: string;
    paidAt: string;
    reference: string | null;
    receivedBy: string | null;
    voidedAt: string | null;
  }[];
  checkIns: {
    id: string;
    checkedInAt: string;
    checkedInBy: string | null;
  }[];
};

const SUB_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  PAST_DUE: "Adeudo",
  CANCELED: "Cancelada",
};

function formatMoney(cents: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(cents / 100);
}

function intervalLabel(interval: string, count: number) {
  if (interval === "YEAR") return count === 1 ? "Anual" : `${count} años`;
  if (count === 1) return "Mensual";
  if (count === 3) return "Trimestral";
  return `${count} meses`;
}

export default function MemberDetail({
  member,
  plans,
  userRoles,
}: {
  member: MemberData;
  plans: PlanOption[];
  userRoles: string[];
}) {
  const router = useRouter();
  const tenant = useTenant();
  const tz = getTenantSettings(tenant)?.timezone ?? "America/Mexico_City";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canManageSub = userRoles.some((r) => r === "OWNER" || r === "ADMIN" || r === "STAFF");

  // Notes state
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(member.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const canEditNotes = userRoles.some((r) => r === "OWNER" || r === "ADMIN");

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/tenant/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesValue || null }),
      });
      if (res.ok) {
        setEditingNotes(false);
        router.refresh();
      }
    } finally {
      setSavingNotes(false);
    }
  }

  // Photo state
  const [uploading, setUploading] = useState(false);
  const [regeneratingQr, setRegeneratingQr] = useState(false);

  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 400;
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
        } else {
          if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.8);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const form = new FormData();
      form.append("photo", compressed, "photo.jpg");
      const res = await fetch(`/api/tenant/members/${member.id}/photo`, {
        method: "POST",
        body: form,
      });
      if (res.ok) router.refresh();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeletePhoto() {
    setUploading(true);
    try {
      const res = await fetch(`/api/tenant/members/${member.id}/photo`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function handleRegenerateQr() {
    setRegeneratingQr(true);
    try {
      const res = await fetch(`/api/tenant/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateQr: true }),
      });
      if (res.ok) router.refresh();
    } finally {
      setRegeneratingQr(false);
    }
  }

  // Assign plan dialog state
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedPriceId, setSelectedPriceId] = useState("");
  const [billingStartDate, setBillingStartDate] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Register payment dialog state
  const [payOpen, setPayOpen] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [payBalanceCents, setPayBalanceCents] = useState(0);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payAmount, setPayAmount] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payDate, setPayDate] = useState("");
  const [paying, setPaying] = useState(false);

  // Delete subscription state
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null);

  // Delete member dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const canDeleteSub = userRoles.some((r) => r === "OWNER" || r === "ADMIN");

  async function handleAssignPlan() {
    setError("");
    setAssigning(true);
    try {
      const res = await fetch("/api/tenant/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantUserId: member.id,
          planId: selectedPlanId,
          priceId: selectedPriceId,
          ...(billingStartDate && { billingStartDate }),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Error");
        return;
      }
      setAssignOpen(false);
      router.refresh();
    } finally {
      setAssigning(false);
    }
  }

  async function handleCancelSub() {
    if (!member.subscription) return;
    const res = await fetch(`/api/tenant/subscriptions/${member.subscription.id}`, {
      method: "PATCH",
    });
    if (res.ok) router.refresh();
  }

  async function handleDeleteSub(subId: string) {
    const res = await fetch(`/api/tenant/subscriptions/${subId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setDeleteSubId(null);
      router.refresh();
    }
  }

  async function handleDeleteMember() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tenant/members/${member.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Error al eliminar");
        return;
      }
      router.push("/admin/members");
    } finally {
      setDeleting(false);
    }
  }

  async function handlePayment() {
    setError("");
    setPaying(true);
    try {
      const res = await fetch("/api/tenant/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: payInvoiceId,
          method: payMethod,
          amountCents: Math.round(parseFloat(payAmount) * 100),
          ...(payDate && { paidAt: payDate }),
          reference: payRef || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Error");
        return;
      }
      setPayOpen(false);
      setPayAmount("");
      setPayRef("");
      setPayDate("");
      router.refresh();
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/members">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="relative group">
          <Avatar className="size-16">
            <AvatarImage src={member.image ?? undefined} alt={member.name ?? ""} />
            <AvatarFallback className="text-lg">
              {(member.name ?? member.email).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              className="size-7 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="size-3.5" />
            </Button>
            {member.image && (
              <Button
                variant="destructive"
                size="icon"
                className="size-7 rounded-full"
                onClick={handleDeletePhoto}
                disabled={uploading}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{member.name ?? member.email}</h1>
            <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"}>
              {member.status === "ACTIVE" ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
      </div>

      {/* Info + Subscription + QR Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Email:</span> {member.email}</p>
            <p><span className="text-muted-foreground">Desde:</span> {formatTenantDate(member.joinedAt, tz)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suscripción</CardTitle>
            {canManageSub && (
              <div className="flex gap-2">
                <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      {member.subscription ? "Cambiar plan" : "Asignar plan"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Asignar plan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Plan</Label>
                        <Select value={selectedPlanId} onValueChange={(v) => { setSelectedPlanId(v); setSelectedPriceId(""); }}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
                          <SelectContent>
                            {plans.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedPlan && (
                        <div>
                          <Label>Precio</Label>
                          <Select value={selectedPriceId} onValueChange={setSelectedPriceId}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar precio" /></SelectTrigger>
                            <SelectContent>
                              {selectedPlan.prices.map((pr) => (
                                <SelectItem key={pr.id} value={pr.id}>
                                  {intervalLabel(pr.interval, pr.intervalCount)} — {formatMoney(pr.amountCents, pr.currency)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {selectedPriceId && (
                        <div>
                          <Label>Fecha de inicio (opcional)</Label>
                          <Input
                            type="date"
                            className="max-w-full"
                            value={billingStartDate}
                            onChange={(e) => setBillingStartDate(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Si el miembro ya pagó antes de registrarse
                          </p>
                        </div>
                      )}
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <Button
                        onClick={handleAssignPlan}
                        disabled={assigning || !selectedPlanId || !selectedPriceId}
                        className="w-full"
                      >
                        {assigning ? "Asignando..." : "Asignar"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                {member.subscription && member.subscription.status !== "CANCELED" && (
                  <Button size="sm" variant="destructive" onClick={handleCancelSub}>
                    Cancelar
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="text-sm">
            {member.subscription ? (
              <div className="space-y-1">
                <p><span className="text-muted-foreground">Plan:</span> {member.subscription.planName}</p>
                <p>
                  <span className="text-muted-foreground">Estado:</span>{" "}
                  <Badge variant={member.subscription.status === "ACTIVE" ? "default" : "destructive"}>
                    {SUB_STATUS_LABELS[member.subscription.status] ?? member.subscription.status}
                  </Badge>
                </p>
                <p><span className="text-muted-foreground">Vence:</span> {formatTenantDate(member.subscription.billingEndsAt, tz)}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Sin suscripción activa</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">QR de acceso</CardTitle>
            {canManageSub && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerateQr}
                disabled={regeneratingQr}
              >
                <RefreshCw className={`size-3.5 mr-1 ${regeneratingQr ? "animate-spin" : ""}`} />
                Regenerar
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex justify-center">
            {member.qrToken ? (
              <div className="rounded-lg bg-white p-2">
                <QRCodeSVG value={member.qrToken} size={120} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Sin QR asignado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes card */}
      {canManageSub && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notas</CardTitle>
            {canEditNotes && !editingNotes && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setNotesValue(member.notes ?? ""); setEditingNotes(true); }}
              >
                <Pencil className="size-3.5 mr-1" />
                Editar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Agregar notas sobre el miembro..."
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{notesValue.length}/500</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)} disabled={savingNotes}>
                      <X className="size-3.5 mr-1" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                      {savingNotes ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {member.notes || <span className="text-muted-foreground">Sin notas</span>}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment dialog (shared, opened from subscription rows) */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Método</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
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
              <Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={payBalanceCents ? (payBalanceCents / 100).toFixed(2) : "499.00"} />
            </div>
            <div>
              <Label>Fecha de pago (opcional)</Label>
              <Input type="date" className="max-w-full" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Si no se indica, se usa la fecha de hoy</p>
            </div>
            <div>
              <Label>Referencia (opcional)</Label>
              <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Folio, recibo..." />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handlePayment} disabled={paying || !payInvoiceId || !payAmount} className="w-full">
              {paying ? "Registrando..." : "Registrar pago"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete subscription confirmation dialog */}
      <Dialog open={!!deleteSubId} onOpenChange={(open) => { if (!open) setDeleteSubId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar suscripción</DialogTitle>
            <DialogDescription>
              Se eliminarán la suscripción, sus facturas y pagos asociados. Esta acción es irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSubId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteSubId && handleDeleteSub(deleteSubId)}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs: Subscriptions + Payments + Check-ins */}
      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">Suscripciones</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
          <TabsTrigger value="checkins">Check-ins</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vence</TableHead>
                  {canManageSub && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {member.subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManageSub ? 5 : 4} className="text-center text-muted-foreground py-6">Sin suscripciones</TableCell>
                  </TableRow>
                ) : (
                  member.subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.planName}</TableCell>
                      <TableCell>{sub.intervalLabel} — {formatMoney(sub.amountCents, sub.currency)}</TableCell>
                      <TableCell>
                        <Badge variant={sub.status === "ACTIVE" ? "default" : sub.status === "PAST_DUE" ? "secondary" : "destructive"}>
                          {SUB_STATUS_LABELS[sub.status] ?? sub.status}
                        </Badge>
                        {sub.openInvoice && sub.openInvoice.balanceCents > 0 && (
                          <span className="ml-2 text-xs text-destructive">
                            Debe {formatMoney(sub.openInvoice.balanceCents, sub.openInvoice.currency)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatTenantDate(sub.billingEndsAt, tz)}</TableCell>
                      {canManageSub && (
                        <TableCell className="text-right space-x-1">
                          {sub.openInvoice && sub.openInvoice.balanceCents > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPayInvoiceId(sub.openInvoice!.id);
                                setPayBalanceCents(sub.openInvoice!.balanceCents);
                                setPayOpen(true);
                              }}
                            >
                              Registrar pago
                            </Button>
                          )}
                          {canDeleteSub && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteSubId(sub.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Registrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {member.payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin pagos</TableCell>
                  </TableRow>
                ) : (
                  member.payments.map((p) => (
                    <TableRow key={p.id} className={p.voidedAt ? "opacity-50" : ""}>
                      <TableCell>{formatTenantDate(p.paidAt, tz)}</TableCell>
                      <TableCell>
                        <span className={p.voidedAt ? "line-through" : ""}>
                          {formatMoney(p.amountCents)}
                        </span>
                        {p.voidedAt && (
                          <Badge variant="destructive" className="ml-2 text-[10px] px-1 py-0">Anulado</Badge>
                        )}
                      </TableCell>
                      <TableCell>{p.method}</TableCell>
                      <TableCell>{p.reference ?? "—"}</TableCell>
                      <TableCell>{p.receivedBy ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="checkins">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Registrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {member.checkIns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sin check-ins</TableCell>
                  </TableRow>
                ) : (
                  member.checkIns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{formatTenantDate(c.checkedInAt, tz)}</TableCell>
                      <TableCell>{formatTenantTime(c.checkedInAt, tz)}</TableCell>
                      <TableCell>{c.checkedInBy ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Danger zone — only OWNER */}
      {userRoles.includes("OWNER") && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive text-sm font-medium">Zona de peligro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Eliminar miembro del gym</p>
                <p className="text-sm text-muted-foreground">
                  Se borrarán sus suscripciones, facturas, pagos y check-ins. Su cuenta de usuario se conserva.
                </p>
              </div>
              <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteConfirmEmail(""); }}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">Eliminar miembro</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Eliminar miembro</DialogTitle>
                    <DialogDescription>
                      Esta acción es irreversible. Se eliminarán todas las suscripciones, facturas, pagos y check-ins de este miembro.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>
                        Escribe <span className="font-mono font-bold">{member.email}</span> para confirmar
                      </Label>
                      <Input
                        value={deleteConfirmEmail}
                        onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                        placeholder={member.email}
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteMember}
                      disabled={deleting || deleteConfirmEmail !== member.email}
                    >
                      {deleting ? "Eliminando..." : "Eliminar definitivamente"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
