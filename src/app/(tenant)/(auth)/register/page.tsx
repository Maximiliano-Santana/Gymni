import RegisterForm from "@/features/auth/components/RegisterForm";
import { validateTenantSubdomain } from "@/features/tenants/lib";
import Link from "next/link";

export default async function RegisterPage() {
  const tenant = await validateTenantSubdomain();

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Completa tus datos para registrarte
        </p>
      </div>

      <RegisterForm tenantId={tenant?.id} tenant={tenant} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="text-primary underline-offset-4 hover:underline font-medium"
        >
          Iniciar sesión
        </Link>
      </p>
    </>
  );
}
