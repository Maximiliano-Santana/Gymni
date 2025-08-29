import z from "zod";

export function validateRequest<T>(schema: z.ZodSchema<T>, body: any) {
  const { success, error, data } = schema.safeParse(body);

  if (!success && error) {
    const message = error.issues
      .map((i) => `${i.path.join(".") || "form"}: ${i.message}`)
      .join(", ");

    return {
      success: false,
      message: `Parámetros inválidos: ${message}`,
    };
  }

  return { success: true, data };
}