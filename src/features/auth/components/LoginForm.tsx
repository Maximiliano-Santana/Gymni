"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { LoginDTO, LoginSchema } from "../types/forms";
import { FormField } from "@/components/ui/form";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Tenant } from "@prisma/client";

export default function LoginForm({ tenant }: { tenant: Tenant | null }) {
  const form = useForm<LoginDTO>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
      tenantId: tenant?.id || "",
    },
  });
  const { update } = useSession();
  const router = useRouter();

  async function onSubmit(values: LoginDTO) {
    const res = await signIn("credentials", { ...values, redirect: false });

    if (res?.error) {
      form.setError("root", { message: "Correo o contraseña incorrectos" });
      return;
    }

    const updated = await update({ refreshTenants: true });
    const subdomain = tenant?.subdomain ?? "";
    const tenantInfo = (updated?.user as any)?.tenants?.[subdomain];
    const roles: string[] = tenantInfo?.roles ?? [];

    const isStaff = roles.some((r) => ["OWNER", "ADMIN", "STAFF"].includes(r));
    router.push(isStaff ? "/admin" : "/dashboard");
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
            <Button variant={"default"}>Clickeable</Button>
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
