import z from "zod";

export const RegisterTenantSchema = z.object({
    name: z.string().nonempty("Campo obligatorio"),
    subdomain: z.string().nonempty("Campo obligatorio"),
    address: z.string().nonempty("Campo requerido"),
    settings: z.json().optional()
})

export type registerTenantDTO = z.infer<typeof RegisterTenantSchema>;