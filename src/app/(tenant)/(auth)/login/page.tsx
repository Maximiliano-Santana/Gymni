import LoginForm from "@/features/auth/components/LoginForm";
import { validateTenantSubdomain } from "@/features/tenants/lib";
import { getTenantSettings } from "@/features/tenants/types/settings";
import Link from "next/link";

export default async function LoginPage() {
  const tenant = await validateTenantSubdomain();
  const settings = tenant ? getTenantSettings(tenant) : null;
  const allowPublic = settings?.allowPublicRegistration ?? false;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ingresa tus credenciales para continuar
        </p>
      </div>

      <LoginForm tenant={tenant} />

      {(!tenant || allowPublic) && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            Crear cuenta
          </Link>
        </p>
      )}
    </>
  );
}
