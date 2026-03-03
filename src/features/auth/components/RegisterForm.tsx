"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { RegisterDTO, RegisterSchema } from "../types/forms";
import { FormField } from "@/components/ui/form";
import { register } from "../lib/api";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isStaffRole } from "@/features/auth/lib";
import type { TenantRole } from "@prisma/client";
import type { TenantTyped } from "@/features/tenants/types/settings";

export default function RegisterForm({
  tenantId = "",
  tenant,
}: {
  tenantId: string | undefined;
  tenant?: TenantTyped | null;
}) {
  const invitation = useSearchParams().get('invitation') || undefined
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterDTO>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      tenantId: tenantId,
      invitation: invitation
    },
  });

  async function onSubmit(values: RegisterDTO) {
    setSubmitting(true);
    try {
      await register(values);

      // Auto-login after successful registration
      const loginRes = await signIn("credentials", {
        email: values.email,
        password: values.password,
        tenantId: values.tenantId,
        redirect: false,
      });

      if (loginRes?.error) {
        // Registered but login failed — send to login page
        router.push("/login");
        return;
      }

      // Redirect based on context
      if (!tenant) {
        router.push("/app");
        return;
      }

      // For tenant context, check roles to decide where to go
      // After fresh registration with invitation, they'll have the invited role
      // We need to refresh the session to get updated tenant info
      const subdomain = tenant.subdomain;
      router.push(invitation ? "/admin" : "/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al registrar";
      form.setError("root", { message: msg });
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex justify-center items-center flex-col"
        >
          <div className="w-46 flex flex-col items-center gap-4">
            <div>
              <Label>Nombre</Label>
              <FormField
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <>
                    <Input type="text" placeholder="John Doe" {...field} />
                    {fieldState.error && (
                      <span className="text-red-500">
                        {fieldState.error.message}
                      </span>
                    )}
                  </>
                )}
              />
            </div>
            <div>
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
                      <span className="text-red-500">
                        {fieldState.error.message}
                      </span>
                    )}
                  </>
                )}
              />
            </div>
            <div>
              <Label>Contraseña</Label>
              <FormField
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <>
                    <Input type="password" placeholder="******" {...field} />
                    {fieldState.error && (
                      <span className="text-red-500">
                        {fieldState.error.message}
                      </span>
                    )}
                  </>
                )}
              />
            </div>
            <Button variant="default" type="submit" disabled={submitting}>
              {submitting ? "Registrando..." : "Registrarse"}
            </Button>
            {form.formState.errors.root?.message && (
              <p className="text-sm text-red-500">
                {form.formState.errors.root.message}
              </p>
            )}
          </div>
        </form>
      </Form>
    </>
  );
}
