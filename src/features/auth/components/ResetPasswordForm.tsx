"use client";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

const passwordRegex =
  /^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%&_*+/()?^-])[A-Za-z\d!@#$%&_*+/()?^-]{6,}$/;

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!passwordRegex.test(password)) {
      setError("Debe tener al menos 6 caracteres, una minúscula, un número y un símbolo (!@#$%&_*+/()?^-)");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Ocurrió un error");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Ocurrió un error de conexión");
    } finally {
      setLoading(false);
    }
  }

  if (!token || !email) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-center text-red-500">
          El enlace es inválido o ha expirado.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-center text-muted-foreground">
          Tu contraseña fue actualizada correctamente.
        </p>
        <Link
          href="/login"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Iniciar sesión
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
        <Label>Nueva contraseña</Label>
        <PasswordInput
          placeholder="******"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="w-46">
        <Label>Confirmar contraseña</Label>
        <PasswordInput
          placeholder="******"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Restablecer contraseña"}
      </Button>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </form>
  );
}
