"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { LoginDTO, LoginSchema } from "../types/forms";
import { FormField } from "@/components/ui/form";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { TenantTyped } from "@/features/tenants/types/settings";
import { isStaffRole } from "@/features/auth/lib";
import type { TenantRole } from "@prisma/client";

export default function LoginForm({ tenant }: { tenant: TenantTyped | null }) {
  const form = useForm<LoginDTO>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
      tenantId: tenant?.id || "",
    },
  });
  const { status, update } = useSession();
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect after Google OAuth callback (session becomes authenticated)
  useEffect(() => {
    if (status !== "authenticated") return;

    async function redirect() {
      const updated = await update({ refreshTenants: true });

      if (!tenant) {
        router.push("/app");
        return;
      }

      const subdomain = tenant.subdomain;
      const userTenants = (updated?.user as { tenants?: Record<string, { roles: TenantRole[] }> })?.tenants;
      const tenantInfo = userTenants?.[subdomain];
      const roles: TenantRole[] = tenantInfo?.roles ?? [];
      router.push(isStaffRole(roles) ? "/admin" : "/dashboard");
    }

    redirect();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: LoginDTO) {
    // Pre-check rate limit before attempting login
    const rlCheck = await fetch("/api/auth/login-check", { method: "POST" });
    if (rlCheck.status === 429) {
      const data = await rlCheck.json();
      form.setError("root", { message: data.message });
      return;
    }

    const res = await signIn("credentials", { ...values, redirect: false });

    if (res?.error) {
      form.setError("root", {
        message: tenant
          ? "Credenciales incorrectas o no perteneces a este gimnasio"
          : "Correo o contraseña incorrectos",
      });
      return;
    }

    const updated = await update({ refreshTenants: true });

    if (!tenant) {
      router.push("/app");
      return;
    }

    const subdomain = tenant.subdomain;
    const userTenants = (updated?.user as { tenants?: Record<string, { roles: TenantRole[] }> })?.tenants;
    const tenantInfo = userTenants?.[subdomain];
    const roles: TenantRole[] = tenantInfo?.roles ?? [];
    router.push(isStaffRole(roles) ? "/admin" : "/dashboard");
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/login" });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label>Correo</Label>
          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <>
                <Input
                  type="text"
                  placeholder="email@mail.com"
                  {...field}
                />
                {fieldState.error && (
                  <span className="text-sm text-destructive">
                    {fieldState.error.message}
                  </span>
                )}
              </>
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Contraseña</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <>
                <PasswordInput placeholder="******" {...field} />
                {fieldState.error && (
                  <span className="text-sm text-destructive">
                    {fieldState.error.message}
                  </span>
                )}
              </>
            )}
          />
        </div>

        <Button variant="default" type="submit" className="w-full">
          Iniciar sesión
        </Button>

        {form.formState.errors.root?.message && (
          <p className="text-sm text-destructive text-center">
            {form.formState.errors.root.message}
          </p>
        )}
      </form>
    </Form>
  );
}
