"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
  roles: string[];
  status: string;
  joinedAt: string;
  subscription: {
    id: string;
    planName: string;
    status: string;
    billingEndsAt: string;
  } | null;
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
  const canManageSub = userRoles.some((r) => r === "OWNER" || r === "ADMIN");

  // Assign plan dialog state
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedPriceId, setSelectedPriceId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Register payment dialog state
  const [payOpen, setPayOpen] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payAmount, setPayAmount] = useState("");
  const [payRef, setPayRef] = useState("");
  const [paying, setPaying] = useState(false);

  const [error, setError] = useState("");

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const openInvoices = member.invoices.filter((inv) => inv.status === "open");

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
        <h1 className="text-2xl font-bold">{member.name ?? member.email}</h1>
        <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"}>
          {member.status === "ACTIVE" ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      {/* Info + Subscription Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Email:</span> {member.email}</p>
            <p><span className="text-muted-foreground">Desde:</span> {new Date(member.joinedAt).toLocaleDateString("es-MX")}</p>
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
                    {member.subscription.status}
                  </Badge>
                </p>
                <p><span className="text-muted-foreground">Vence:</span> {new Date(member.subscription.billingEndsAt).toLocaleDateString("es-MX")}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Sin suscripción activa</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Invoices + Payments */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Facturas</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-3">
          {openInvoices.length > 0 && canManageSub && (
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Registrar pago</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar pago</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Factura</Label>
                    <Select value={payInvoiceId} onValueChange={setPayInvoiceId}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar factura" /></SelectTrigger>
                      <SelectContent>
                        {openInvoices.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {formatMoney(inv.amountCents, inv.currency)} — {new Date(inv.issuedAt).toLocaleDateString("es-MX")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                    <Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="499.00" />
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
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {member.invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sin facturas</TableCell>
                  </TableRow>
                ) : (
                  member.invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{new Date(inv.issuedAt).toLocaleDateString("es-MX")}</TableCell>
                      <TableCell>{formatMoney(inv.amountCents, inv.currency)}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === "paid" ? "default" : inv.status === "open" ? "secondary" : "destructive"}>
                          {inv.status}
                        </Badge>
                      </TableCell>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {member.payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin pagos</TableCell>
                  </TableRow>
                ) : (
                  member.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.paidAt).toLocaleDateString("es-MX")}</TableCell>
                      <TableCell>{formatMoney(p.amountCents)}</TableCell>
                      <TableCell>{p.method}</TableCell>
                      <TableCell>{p.reference ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
