"use client";

import { useCallback, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, CheckCircle2, XCircle, ScanLine } from "lucide-react";
import type { CheckInMemberInfo } from "@/features/checkin/types";

type ScreenState =
  | { step: "scanning" }
  | { step: "preview"; member: CheckInMemberInfo }
  | { step: "confirmed"; name: string }
  | { step: "error"; message: string };

export default function CheckInScreen() {
  const [state, setState] = useState<ScreenState>({ step: "scanning" });
  const [loading, setLoading] = useState(false);

  const handleScan = useCallback(
    async (result: { rawValue: string }[]) => {
      if (loading || state.step !== "scanning") return;
      const qrToken = result[0]?.rawValue;
      if (!qrToken) return;

      setLoading(true);
      try {
        const res = await fetch("/api/tenant/checkin/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken }),
        });
        const json = await res.json();
        if (!res.ok) {
          setState({ step: "error", message: json.message ?? "Miembro no encontrado" });
          return;
        }
        const member = json.data as CheckInMemberInfo;
        if (member.lastCheckIn) {
          setState({ step: "error", message: "Ya registró asistencia hoy" });
          return;
        }
        setState({ step: "preview", member });
      } catch {
        setState({ step: "error", message: "Error de conexión" });
      } finally {
        setLoading(false);
      }
    },
    [loading, state.step]
  );

  async function handleConfirm() {
    if (state.step !== "preview") return;
    setLoading(true);
    try {
      const res = await fetch("/api/tenant/checkin/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantUserId: state.member.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setState({ step: "error", message: json.message ?? "Error al registrar" });
        return;
      }
      const name = state.member.name ?? state.member.email;
      setState({ step: "confirmed", name });
      setTimeout(() => setState({ step: "scanning" }), 3000);
    } catch {
      setState({ step: "error", message: "Error de conexión" });
    } finally {
      setLoading(false);
    }
  }

  function resetToScan() {
    setState({ step: "scanning" });
  }

  return (
    <div className="mx-auto max-w-lg">
      {state.step === "scanning" && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <ScanLine className="size-5" />
              <p className="text-sm font-medium">Escanea el QR del miembro</p>
            </div>
            <div className="overflow-hidden rounded-lg aspect-square">
              <Scanner
                onScan={handleScan}
                formats={["qr_code"]}
                components={{ finder: true }}
                styles={{ container: { width: "100%", height: "100%" } }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "preview" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <Avatar className="size-24">
              <AvatarImage src={state.member.image ?? undefined} alt={state.member.name ?? ""} />
              <AvatarFallback className="text-2xl">
                {(state.member.name ?? state.member.email).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold">{state.member.name ?? state.member.email}</h2>
              <p className="text-sm text-muted-foreground">{state.member.email}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant={state.member.status === "ACTIVE" ? "default" : "secondary"}>
                {state.member.status === "ACTIVE" ? "Activo" : "Inactivo"}
              </Badge>
              {state.member.subscription && (
                <Badge variant="outline">{state.member.subscription.planName}</Badge>
              )}
            </div>
            {state.member.subscription && (
              <p className="text-xs text-muted-foreground">
                Vence: {new Date(state.member.subscription.billingEndsAt).toLocaleDateString("es-MX")}
              </p>
            )}
            {state.member.warning && (
              <div className="w-full rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive font-medium">{state.member.warning}</p>
              </div>
            )}
            <div className="flex gap-3 w-full mt-2">
              <Button variant="outline" className="flex-1" onClick={resetToScan} disabled={loading}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={loading}>
                {loading ? "Registrando..." : "Confirmar check-in"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "confirmed" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <CheckCircle2 className="size-16 text-green-500" />
            <h2 className="text-xl font-bold">Check-in exitoso</h2>
            <p className="text-muted-foreground">{state.name}</p>
            <p className="text-xs text-muted-foreground">Regresando al escáner...</p>
          </CardContent>
        </Card>
      )}

      {state.step === "error" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <XCircle className="size-16 text-destructive" />
            <h2 className="text-lg font-bold">Error</h2>
            <p className="text-muted-foreground text-center">{state.message}</p>
            <Button onClick={resetToScan} variant="outline">
              Volver a escanear
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
