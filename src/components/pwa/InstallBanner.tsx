"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    // Already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Desktop — skip
    if (!("ontouchstart" in window) && !navigator.maxTouchPoints) return;

    // Dismissed this session
    if (sessionStorage.getItem("pwa-dismissed")) return;

    setVisible(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") setVisible(false);
    } else {
      setShowTip(true);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem("pwa-dismissed", "1");
  };

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="fixed top-0 inset-x-0 z-50">
      <div className="bg-primary px-4 py-2.5 text-primary-foreground">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <p className="text-sm truncate min-w-0">
            Agregar app a pantalla de inicio
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstall}
              className="rounded-md bg-primary-foreground/20 px-3 py-1 text-sm font-medium hover:bg-primary-foreground/30 transition-colors"
            >
              Agregar
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-md p-1 hover:bg-primary-foreground/20 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {showTip && (
        <div className="bg-background border-b border-border px-4 py-2">
          <p className="mx-auto max-w-4xl text-xs text-muted-foreground">
            {isIOS
              ? 'Toca el botón "Compartir" y luego "Agregar a inicio"'
              : 'Abre el menú del navegador (⋮) y selecciona "Instalar aplicación"'}
          </p>
        </div>
      )}
    </div>
  );
}
