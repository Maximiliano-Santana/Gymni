"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, ArrowLeft, CheckCircle2, XCircle, ScanLine, Search } from "lucide-react";
import type { CheckInMemberInfo } from "@/features/checkin/types";
import { useTenant } from "@/features/tenants/providers/tenant-context";
import { getTenantSettings } from "@/features/tenants/types/settings";
import { formatTenantDate } from "@/lib/timezone";

type ScreenState =
  | { step: "scanning" }
  | { step: "preview"; member: CheckInMemberInfo }
  | { step: "confirmed"; name: string }
  | { step: "already"; member: CheckInMemberInfo }
  | { step: "error"; message: string };

export default function CheckInScreen() {
  const tenant = useTenant();
  const tz = getTenantSettings(tenant)?.timezone ?? "America/Mexico_City";
  const [state, setState] = useState<ScreenState>({ step: "scanning" });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CheckInMemberInfo[]>([]);
  const [searching, setSearching] = useState(false);

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
          setState({ step: "already", member });
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

  // Debounced search
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch("/api/tenant/checkin/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: search.trim() }),
        });
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.data);
        }
      } catch {
        // silently fail
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function selectMember(member: CheckInMemberInfo) {
    setSearch("");
    setSearchResults([]);
    if (member.lastCheckIn) {
      setState({ step: "already", member });
    } else {
      setState({ step: "preview", member });
    }
  }

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
    setSearch("");
    setSearchResults([]);
  }

  return (
    <div className="mx-auto max-w-lg">
      {state.step === "scanning" && (
        <div className="space-y-4">
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

          {/* Manual search */}
          <Card>
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Search className="size-4" />
                <p className="text-sm font-medium">O buscar por nombre</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searching && (
                <p className="text-xs text-muted-foreground">Buscando...</p>
              )}
              {searchResults.length > 0 && (
                <div className="space-y-1">
                  {searchResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectMember(m)}
                      className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent transition-colors"
                    >
                      <Avatar className="size-8">
                        <AvatarImage src={m.image ?? undefined} alt={m.name ?? ""} />
                        <AvatarFallback className="text-xs">
                          {(m.name ?? m.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.name ?? m.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      </div>
                      {m.lastCheckIn && (
                        <Badge variant="secondary" className="text-xs">Ya entró</Badge>
                      )}
                      {m.warning && !m.lastCheckIn && (
                        <AlertTriangle className="size-4 text-destructive flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
              {search.trim() && !searching && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground">No se encontraron miembros</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {state.step === "preview" && (
        <Card>
          <CardContent className="relative flex flex-col items-center gap-4 py-8">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-2"
              onClick={resetToScan}
              disabled={loading}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <Avatar className="size-32">
              <AvatarImage src={state.member.image ?? undefined} alt={state.member.name ?? ""} />
              <AvatarFallback className="text-4xl">
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
                Vence: {formatTenantDate(state.member.subscription.billingEndsAt, tz)}
              </p>
            )}
            {state.member.warning && (
              <div className="w-full rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive font-medium">{state.member.warning}</p>
              </div>
            )}
            <div className="flex gap-3 w-full mt-2">
              <Button variant="outline" className="flex-1" asChild>
                <Link href={`/admin/members/${state.member.id}`}>Ver miembro</Link>
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={loading}>
                {loading ? "Registrando..." : "Registrar check-in"}
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

      {state.step === "already" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <Avatar className="size-32">
              <AvatarImage src={state.member.image ?? undefined} alt={state.member.name ?? ""} />
              <AvatarFallback className="text-4xl">
                {(state.member.name ?? state.member.email).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold">{state.member.name ?? state.member.email}</h2>
              <p className="text-sm text-muted-foreground">{state.member.email}</p>
            </div>
            <Badge variant="secondary">Ya registró asistencia hoy</Badge>
            <div className="flex gap-3 w-full mt-2">
              <Button variant="outline" className="flex-1" onClick={resetToScan}>
                Volver
              </Button>
              <Button className="flex-1" asChild>
                <Link href={`/admin/members/${state.member.id}`}>Ver miembro</Link>
              </Button>
            </div>
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
              Volver
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
