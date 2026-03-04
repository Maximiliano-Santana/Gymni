"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";

export default function MemberQrCode() {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tenant/me/qr")
      .then((r) => r.json())
      .then((json) => setQrToken(json.data?.qrToken ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="sm:min-w-72">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <QrCode className="size-4" />
          Mi QR de acceso
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        {loading ? (
          <div className="h-[200px] w-[200px] animate-pulse rounded-lg bg-muted" />
        ) : qrToken ? (
          <>
            <div className="rounded-lg bg-white p-3">
              <QRCodeSVG value={qrToken} size={200} />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Muestra este código en la recepción
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-8">
            No se pudo generar el QR
          </p>
        )}
      </CardContent>
    </Card>
  );
}
