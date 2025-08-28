"use client";

const passwordRegex =
  /^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%&_*+/()?^-])[A-Za-z\d!@#$%&_*+/()?^-]{6,}$/;

import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().nonempty("Campo obligatorio"),
  email: z.string().email("Correo inválido").nonempty("Campo obligatorio"),
  password: z
    .string()
    .min(6, { message: "Debe tener al menos 6 caracteres" })
    .nonempty("Campo obligatorio")
    .regex(passwordRegex, {
      message:
        "Debe tener minúscula, número y símbolo (!@#$%&_*+/()?^-)", // 👈 texto actualizado
    }),
});

export type RegisterDTO = z.infer<typeof RegisterSchema>;
