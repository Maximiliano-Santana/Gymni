"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { LoginDTO, LoginSchema, RegisterDTO, RegisterSchema } from "../types/forms";
import { FormField } from "@/components/ui/form";
import { signIn } from 'next-auth/react'
import { useEffect } from "react";
import { email } from 'zod';
import { redirect } from "next/navigation";

export default function LoginForm({
  tenantId = "",
}: {
  tenantId: string | undefined;
}) {
  const form = useForm<LoginDTO>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
      tenantId: tenantId
    },
  });

  useEffect(()=>{console.log(tenantId)},[])

  async function onSubmit(values: LoginDTO) {
    console.log(values);
    const res = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false
    })

    if(res && res.error){
        alert(res.error);
    }else{
        redirect("/dashboard")
    }

    console.log(res);
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
