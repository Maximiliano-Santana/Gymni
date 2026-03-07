"use client";

import { useSession, signOut } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [status, setStatus] = useState<"waiting" | "verifying" | "success" | "error">(
    token ? "verifying" : "waiting"
  );
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const verifyAttempted = useRef(false);

  const userEmail = session?.user?.email || emailParam || "";

  // If already verified, redirect
  useEffect(() => {
    if (session?.user?.emailVerified) {
      router.replace("/dashboard");
    }
  }, [session?.user?.emailVerified, router]);

  // Auto-verify when token is in URL
  useEffect(() => {
    if (!token || !emailParam || verifyAttempted.current) return;
    verifyAttempted.current = true;

    async function verify() {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email: emailParam }),
        });

        if (!res.ok) {
          const data = await res.json();
          setStatus("error");
          setMessage(data.message || "Error al verificar");
          return;
        }

        // Refresh JWT to include emailVerified
        await update({ refreshEmailVerified: true });
        setStatus("success");

        // Redirect after brief success message
        setTimeout(() => {
          router.replace("/dashboard");
        }, 1500);
      } catch {
        setStatus("error");
        setMessage("Error de conexión");
      }
    }

    verify();
  }, [token, emailParam, update, router]);

  async function handleResend() {
    if (!userEmail || resending) return;
    setResending(true);
    setResent(false);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, resend: true }),
      });
      if (res.ok) {
        setResent(true);
      } else {
        console.error("[resend verify]", await res.text());
      }
    } catch {
      // Network error
    } finally {
      setResending(false);
    }
  }

  // Verifying state
  if (status === "verifying") {
    return (
      <div className="text-center space-y-4">
        <Loader2 className="size-10 text-primary animate-spin mx-auto" />
        <h1 className="text-2xl font-bold tracking-tight">Verificando...</h1>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="text-center space-y-4">
        <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
        <h1 className="text-2xl font-bold tracking-tight">Correo verificado</h1>
        <p className="text-sm text-muted-foreground">Redirigiendo...</p>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="text-center space-y-4">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold tracking-tight">No se pudo verificar</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button onClick={handleResend} disabled={resending} className="w-full">
          {resending ? "Enviando..." : "Reenviar email de verificación"}
        </Button>
      </div>
    );
  }

  // Waiting state — user needs to check their email
  return (
    <div className="text-center space-y-4">
      <Mail className="size-10 text-primary mx-auto" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verifica tu correo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enviamos un link de verificación a
        </p>
        {userEmail && (
          <p className="text-sm font-medium mt-1">{userEmail}</p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Revisa tu bandeja de entrada (y spam)
      </p>

      <Button
        variant="outline"
        onClick={handleResend}
        disabled={resending || resent}
        className="w-full"
      >
        {resent ? "Email reenviado" : resending ? "Enviando..." : "Reenviar email"}
      </Button>

      <button
        onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
        className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
      >
        ¿Email incorrecto? Cerrar sesión
      </button>
    </div>
  );
}
