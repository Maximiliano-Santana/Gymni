"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, Users } from "lucide-react";

type PriceData = {
  id: string;
  interval: string;
  intervalCount: number;
  amountCents: number;
  currency: string;
  isActive: boolean;
};

type PlanData = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  activeSubscriptions: number;
  prices: PriceData[];
};

// The 3 fixed tiers we support in the UI
const TIERS = [
  { interval: "MONTH", intervalCount: 1, label: "Mensual" },
  { interval: "MONTH", intervalCount: 3, label: "Trimestral" },
  { interval: "YEAR", intervalCount: 1, label: "Anual" },
] as const;

function formatMoney(cents: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(cents / 100);
}

function intervalLabel(interval: string, count: number) {
  if (interval === "YEAR") return count === 1 ? "Anual" : `${count} años`;
  if (count === 1) return "Mensual";
  if (count === 3) return "Trimestral";
  return `${count} meses`;
}

function findPrice(prices: PriceData[], interval: string, intervalCount: number) {
  return prices.find((p) => p.interval === interval && p.intervalCount === intervalCount);
}

export default function PlansView({ initialPlans }: { initialPlans: PlanData[] }) {
  const router = useRouter();

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prices, setPrices] = useState([
    { interval: "MONTH", intervalCount: 1, amountCents: 0 },
    { interval: "MONTH", intervalCount: 3, amountCents: 0 },
    { interval: "YEAR", intervalCount: 1, amountCents: 0 },
  ]);

  // Edit dialog
  const [editingPlan, setEditingPlan] = useState<PlanData | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrices, setEditPrices] = useState<{ id?: string; interval: string; intervalCount: number; amountCents: number }[]>([]);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  function updatePrice(index: number, value: string) {
    const next = [...prices];
    next[index] = { ...next[index], amountCents: Math.round(parseFloat(value || "0") * 100) };
    setPrices(next);
  }

  function updateEditPrice(index: number, value: string) {
    const next = [...editPrices];
    next[index] = { ...next[index], amountCents: Math.round(parseFloat(value || "0") * 100) };
    setEditPrices(next);
  }

  function openEditDialog(plan: PlanData) {
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditDescription(plan.description ?? "");
    // Build the 3 tiers with existing price IDs if they exist
    setEditPrices(
      TIERS.map((tier) => {
        const existing = findPrice(plan.prices, tier.interval, tier.intervalCount);
        return {
          id: existing?.id,
          interval: tier.interval,
          intervalCount: tier.intervalCount,
          amountCents: existing && existing.isActive ? existing.amountCents : 0,
        };
      })
    );
    setEditError("");
  }

  async function handleCreate() {
    setError("");
    setCreating(true);
    try {
      const activePrices = prices.filter((p) => p.amountCents > 0);
      if (activePrices.length === 0) {
        setError("Al menos un precio debe ser mayor a $0");
        return;
      }
      const res = await fetch("/api/tenant/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase(),
          name,
          description: description || undefined,
          prices: activePrices.map((p) => ({ ...p, currency: "MXN" })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Error al crear plan");
        return;
      }
      setDialogOpen(false);
      setCode("");
      setName("");
      setDescription("");
      setPrices([
        { interval: "MONTH", intervalCount: 1, amountCents: 0 },
        { interval: "MONTH", intervalCount: 3, amountCents: 0 },
        { interval: "YEAR", intervalCount: 1, amountCents: 0 },
      ]);
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function handleEdit() {
    if (!editingPlan) return;
    setEditError("");
    setEditing(true);
    try {
      const hasAtLeastOnePrice = editPrices.some((p) => p.amountCents > 0);
      if (!hasAtLeastOnePrice) {
        setEditError("Al menos un precio debe ser mayor a $0");
        return;
      }
      const res = await fetch(`/api/tenant/plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription || undefined,
          prices: editPrices.map((p) => ({
            ...p,
            currency: "MXN",
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.message ?? "Error al actualizar plan");
        return;
      }
      setEditingPlan(null);
      router.refresh();
    } finally {
      setEditing(false);
    }
  }

  async function handleToggle(planId: string, isActive: boolean) {
    await fetch(`/api/tenant/plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Crear plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear plan de membresía</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Código</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PREMIUM" />
              </div>
              <div>
                <Label>Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Premium" />
              </div>
              <div>
                <Label>Descripción (opcional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Acceso completo..." />
              </div>
              <div className="space-y-2">
                <Label>Precios (MXN)</Label>
                <div className="grid gap-2">
                  {TIERS.map((tier, i) => (
                    <div key={`${tier.interval}-${tier.intervalCount}`} className="flex items-center gap-2">
                      <span className="text-sm w-24">{tier.label}</span>
                      <Input type="number" step="0.01" placeholder="0.00" onChange={(e) => updatePrice(i, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handleCreate} disabled={creating || !code || !name} className="w-full">
                {creating ? "Creando..." : "Crear plan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => { if (!open) setEditingPlan(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Precios (MXN)</Label>
              <div className="grid gap-2">
                {TIERS.map((tier, i) => (
                  <div key={`${editingPlan?.id}-${tier.interval}-${tier.intervalCount}`} className="flex items-center gap-2">
                    <span className="text-sm w-24">{tier.label}</span>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={editPrices[i]?.amountCents ? (editPrices[i].amountCents / 100) : ""}
                      placeholder="0.00"
                      onChange={(e) => updateEditPrice(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Poner en $0 para desactivar un tier.</p>
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <Button onClick={handleEdit} disabled={editing || !editName} className="w-full">
              {editing ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initialPlans.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-12">No hay planes creados</p>
        ) : (
          initialPlans.map((plan) => (
            <Card key={plan.id} className={!plan.isActive ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{plan.code}</p>
                </div>
                <Badge variant={plan.isActive ? "default" : "secondary"}>
                  {plan.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}
                <div className="space-y-1">
                  {plan.prices.filter((pr) => pr.isActive).map((pr) => (
                    <div key={pr.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {intervalLabel(pr.interval, pr.intervalCount)}
                      </span>
                      <span className="font-medium">
                        {formatMoney(pr.amountCents, pr.currency)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="size-3" />
                    {plan.activeSubscriptions} activos
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(plan)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggle(plan.id, plan.isActive)}
                    >
                      {plan.isActive ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
