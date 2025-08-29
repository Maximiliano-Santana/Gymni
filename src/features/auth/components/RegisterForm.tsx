"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { email, z } from "zod";
import { RegisterDTO, RegisterSchema } from "../types/forms";
import { FormField } from "@/components/ui/form";
import { api, ApiError } from "@/lib/axios";
import { register } from "../lib/api";
import { FieldErrors } from "../../../lib/axios";

export default function RegisterForm() {
  const form = useForm<RegisterDTO>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: RegisterDTO) {
    try {
      const res = await register(values)
      console.log(res);
    } catch (e: any) {
      console.log(e.message)
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
            <h1 className="text-primary bg-accent w-full text-center">
              {/* Hello {tenant?.name} */}
            </h1>
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
