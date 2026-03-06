"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateTenantCSS } from "@/features/tenants/server/theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageIcon, Trash2, Upload, Loader2 } from "lucide-react";

type SettingsData = {
  name: string;
  address: string;
  mode: string;
  primaryColor: string;
  grayBase: string;
  successColor: string;
  warningColor: string;
  borderRadius: string;
  graceDays: number;
  autoCancelDays: number;
  logoUrl: string | null;
  faviconUrl: string | null;
};

async function compressImage(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
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
      canvas.toBlob((blob) => resolve(blob!), "image/png", 0.9);
    };
    img.src = URL.createObjectURL(file);
  });
}

function BrandingUpload({
  label,
  description,
  imageUrl,
  onUploaded,
  onDeleted,
  type,
}: {
  label: string;
  description: string;
  imageUrl: string | null;
  onUploaded: (url: string) => void;
  onDeleted: () => void;
  type: "logo" | "favicon";
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const maxSize = type === "favicon" ? 128 : 400;
      const compressed = await compressImage(file, maxSize);
      const formData = new FormData();
      formData.append("file", compressed, file.name);
      formData.append("type", type);
      const res = await fetch("/api/tenant/settings/branding", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const { data } = await res.json();
        onUploaded(data.url);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    setUploading(true);
    try {
      const res = await fetch("/api/tenant/settings/branding", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) onDeleted();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="flex items-center gap-4">
        <div className="size-20 rounded-lg border border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50">
          {imageUrl ? (
            <img src={imageUrl} alt={label} className="max-h-full max-w-full object-contain p-1" />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Upload className="size-4 mr-1" />}
            Subir
          </Button>
          {imageUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={uploading}
            >
              <Trash2 className="size-4 mr-1" />
              Eliminar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  description,
  value,
  onChange,
  placeholder,
  presets,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  presets?: { color: string; label: string }[];
}) {
  return (
    <div>
      <Label>{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground mb-1">{description}</p>
      )}
      <div className="flex items-center gap-3 mt-1">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 rounded border cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="max-w-32"
        />
        <div
          className="size-10 rounded border"
          style={{ backgroundColor: value || undefined }}
        />
      </div>
      {presets && (
        <div className="flex items-center gap-2 mt-2">
          {presets.map((p) => (
            <button
              key={p.color}
              type="button"
              title={p.label}
              onClick={() => onChange(p.color)}
              className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${value === p.color ? "border-foreground scale-110" : "border-transparent"}`}
              style={{ backgroundColor: p.color }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsForm({ initialData }: { initialData: SettingsData }) {
  const router = useRouter();
  const [name, setName] = useState(initialData.name);
  const [address, setAddress] = useState(initialData.address);
  const [mode, setMode] = useState(initialData.mode);
  const [primaryColor, setPrimaryColor] = useState(initialData.primaryColor);
  const [grayBase, setGrayBase] = useState(initialData.grayBase);
  const [successColor, setSuccessColor] = useState(initialData.successColor);
  const [warningColor, setWarningColor] = useState(initialData.warningColor);
  const [borderRadius, setBorderRadius] = useState(initialData.borderRadius);
  const [graceDays, setGraceDays] = useState(initialData.graceDays);
  const [autoCancelDays, setAutoCancelDays] = useState(initialData.autoCancelDays);
  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl);
  const [faviconUrl, setFaviconUrl] = useState(initialData.faviconUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Live theme preview
  useEffect(() => {
    const css = generateTenantCSS({
      version: "1.0.0",
      mode: mode as "light" | "dark",
      metadata: { name: "" },
      colors: {
        primary: primaryColor,
        grayBase,
        success: successColor,
        warning: warningColor,
      },
      layout: { borderRadius: { base: borderRadius } },
      assets: {},
      billing: {},
    });
    const style = document.createElement("style");
    style.setAttribute("data-theme-preview", "true");
    style.textContent = css;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [mode, primaryColor, grayBase, successColor, warningColor, borderRadius]);

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
            colors: {
              primary: primaryColor,
              grayBase,
              success: successColor,
              warning: warningColor,
            },
            layout: { borderRadius: { base: borderRadius } },
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
          <CardTitle>Marca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <BrandingUpload
            label="Logo"
            description="Se muestra en el sidebar, login y dashboard. Recomendado: PNG transparente."
            imageUrl={logoUrl}
            type="logo"
            onUploaded={(url) => { setLogoUrl(url); router.refresh(); }}
            onDeleted={() => { setLogoUrl(null); router.refresh(); }}
          />
          <BrandingUpload
            label="Favicon"
            description="Icono de la pestaña del navegador. Recomendado: cuadrado, 128×128px."
            imageUrl={faviconUrl}
            type="favicon"
            onUploaded={(url) => { setFaviconUrl(url); router.refresh(); }}
            onDeleted={() => { setFaviconUrl(null); router.refresh(); }}
          />
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
          <ColorField
            label="Color primario"
            value={primaryColor}
            onChange={setPrimaryColor}
            placeholder="#e86c00"
          />
          <ColorField
            label="Base de grises"
            description="Color base para la escala de grises de la interfaz"
            value={grayBase}
            onChange={setGrayBase}
            placeholder="#545454"
          />
          <ColorField
            label="Color de éxito"
            value={successColor}
            onChange={setSuccessColor}
            placeholder="#2db224"
            presets={[
              { color: "#22c55e", label: "Verde" },
              { color: "#2db224", label: "Verde oscuro" },
              { color: "#10b981", label: "Esmeralda" },
              { color: "#06b6d4", label: "Cyan" },
              { color: "#3b82f6", label: "Azul" },
            ]}
          />
          <ColorField
            label="Color de advertencia"
            value={warningColor}
            onChange={setWarningColor}
            placeholder="#eb7b7b"
            presets={[
              { color: "#ef4444", label: "Rojo" },
              { color: "#f87171", label: "Rojo claro" },
              { color: "#eb7b7b", label: "Coral" },
              { color: "#f59e0b", label: "Ámbar" },
              { color: "#f97316", label: "Naranja" },
            ]}
          />
          <div>
            <Label>Bordes redondeados</Label>
            <Select value={borderRadius} onValueChange={setBorderRadius}>
              <SelectTrigger className="max-w-48 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0rem">Cuadrado</SelectItem>
                <SelectItem value="0.25rem">Sutil</SelectItem>
                <SelectItem value="0.5rem">Medio</SelectItem>
                <SelectItem value="0.75rem">Redondeado</SelectItem>
                <SelectItem value="1rem">Muy redondeado</SelectItem>
              </SelectContent>
            </Select>
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
