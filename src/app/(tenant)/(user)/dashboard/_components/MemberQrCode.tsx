"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";

const SIZE_MAP = { sm: 200, lg: 280 } as const;

export default function MemberQrCode({ size = "sm" }: { size?: "sm" | "lg" }) {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const px = SIZE_MAP[size];

  useEffect(() => {
    fetch("/api/tenant/me/qr")
      .then((r) => r.json())
      .then((json) => setQrToken(json.data?.qrToken ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const qrContent = loading ? (
    <div
      className="animate-pulse rounded-lg bg-muted"
      style={{ height: px, width: px }}
    />
  ) : qrToken ? (
    <div className="rounded-lg bg-white p-3">
      <QRCodeSVG value={qrToken} size={px} />
    </div>
  ) : (
    <p className="text-sm text-muted-foreground py-8">
      No se pudo generar el QR
    </p>
  );

  if (size === "lg") {
    return <div className="flex flex-col items-center gap-3">{qrContent}</div>;
  }

  return (
    <Card className="sm:min-w-72">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <QrCode className="size-4" />
          Mi QR de acceso
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        {qrContent}
        {!loading && qrToken && (
          <p className="text-xs text-muted-foreground text-center">
            Muestra este código en la recepción
          </p>
        )}
      </CardContent>
    </Card>
  );
}
