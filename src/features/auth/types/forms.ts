const passwordRegex =
  /^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%&_*+/()?^-])[A-Za-z\d!@#$%&_*+/()?^-]{6,}$/;

import { TenantRole } from "@prisma/client";
import { email, z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().nonempty("Campo obligatorio"),
  email: z.string().email("Correo inválido").nonempty("Campo obligatorio"),
  password: z
    .string()
    .min(6, { message: "Debe tener al menos 6 caracteres" })
    .nonempty("Campo obligatorio")
    .regex(passwordRegex, {
      message: "Debe tener minúscula, número y símbolo (!@#$%&_*+/()?^-)",
    }),
  tenantId: z.string().optional(),
  invitation: z.string().optional()
});

export type RegisterDTO = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Correo inválido").nonempty("Campo obligatorio"),
  password: z
    .string()
    .min(6, { message: "Debe tener al menos 6 caracteres" })
    .nonempty("Campo obligatorio")
    .regex(passwordRegex, {
      message: "Debe tener minúscula, número y símbolo (!@#$%&_*+/()?^-)",
    }),
  tenantId: z.string().optional(),
});

export type LoginDTO = z.infer<typeof LoginSchema>;

export const InvitationSchema = z.object({
  email: z.string().email("Correo inválido").nonempty("Campo obligatorio"),
  tenantId: z.string(),
  role: z.nativeEnum(TenantRole)
})

export type InvitationDTO = z.infer<typeof InvitationSchema>