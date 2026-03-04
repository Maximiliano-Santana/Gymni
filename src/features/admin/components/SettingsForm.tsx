"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type SettingsData = {
  name: string;
  address: string;
  mode: string;
  primaryColor: string;
  graceDays: number;
  autoCancelDays: number;
};

export default function SettingsForm({ initialData }: { initialData: SettingsData }) {
  const router = useRouter();
  const [name, setName] = useState(initialData.name);
  const [address, setAddress] = useState(initialData.address);
  const [mode, setMode] = useState(initialData.mode);
  const [primaryColor, setPrimaryColor] = useState(initialData.primaryColor);
  const [graceDays, setGraceDays] = useState(initialData.graceDays);
  const [autoCancelDays, setAutoCancelDays] = useState(initialData.autoCancelDays);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/tenant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address,
          settings: {
            mode,
            colors: { primary: primaryColor },
            billing: { graceDays, autoCancelDays },
          },
        }),
      });
      if (res.ok) {
        setMessage("Guardado correctamente");
        router.refresh();
      } else {
        const data = await res.json();
        setMessage(data.message ?? "Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nombre del gym</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Dirección</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Modo oscuro</Label>
            <Switch
              checked={mode === "dark"}
              onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
            />
          </div>
          <div>
            <Label>Color primario</Label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 rounded border cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#f97316"
                className="max-w-32"
              />
              <div
                className="size-10 rounded border"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facturación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Días de gracia</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Días después del inicio del período para pagar antes de marcar como adeudo
            </p>
            <Input
              type="number"
              min={0}
              max={30}
              value={graceDays}
              onChange={(e) => setGraceDays(Number(e.target.value))}
              className="max-w-32"
            />
          </div>
          <div>
            <Label>Auto-cancelar después de (días)</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Días en adeudo antes de cancelar la membresía automáticamente. 0 = nunca
            </p>
            <Input
              type="number"
              min={0}
              max={365}
              value={autoCancelDays}
              onChange={(e) => setAutoCancelDays(Number(e.target.value))}
              className="max-w-32"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
        {message && (
          <p className={`text-sm ${message.includes("Error") ? "text-destructive" : "text-muted-foreground"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
