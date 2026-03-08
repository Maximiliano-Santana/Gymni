import RegisterForm from "@/features/auth/components/RegisterForm";
import { validateTenantSubdomain } from "@/features/tenants/lib";
import { getTenantSettings } from "@/features/tenants/types/settings";
import Link from "next/link";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invitation?: string }>;
}) {
  const tenant = await validateTenantSubdomain();
  const { invitation } = await searchParams;
  const settings = tenant ? getTenantSettings(tenant) : null;
  const allowPublic = settings?.allowPublicRegistration ?? false;

  // Block public registration on tenant subdomains (allow with invitation)
  if (tenant && !allowPublic && !invitation) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Registro no disponible</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Este gimnasio no permite registro público. Acércate a recepción
            para que te creen tu cuenta.
          </p>
        </div>

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
