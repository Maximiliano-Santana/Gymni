"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Ocurrió un error");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Ocurrió un error de conexión");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-center text-muted-foreground">
          Si tu correo está registrado, recibirás un enlace para restablecer tu
          contraseña.
        </p>
        <Link
          href="/login"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Volver al login
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center gap-4"
    >
      <div className="w-46">
        <Label>Correo</Label>
        <Input
          type="email"
          placeholder="email@mail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Enviando..." : "Enviar enlace"}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Link
        href="/login"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Volver al login
      </Link>
    </form>
  );
}
