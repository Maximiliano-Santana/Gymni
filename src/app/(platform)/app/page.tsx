import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { isStaffRole } from "@/features/auth/lib";

function buildTenantUrl(subdomain: string, host: string, path: string) {
  const isLocal = host.startsWith("localhost");
  const protocol = isLocal ? "http" : "https";
  return `${protocol}://${subdomain}.${host}${path}`;
}

export default async function PlatformDashboard() {
  const [session, h] = await Promise.all([
    getServerSession(authOptions),
    headers(),
  ]);
  if (!session) redirect("/login");

  const host = h.get("host") || "localhost:3000";
  const tenants = session.user.tenants ?? {};
  const allEntries = Object.entries(tenants);
  const managed = allEntries.filter(([, { roles }]) => isStaffRole(roles));
  const memberOf = allEntries.filter(([, { roles }]) => !isStaffRole(roles));

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      <h1 className="text-2xl font-bold">Mis Gimnasios</h1>

      {managed.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Administras</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {managed.map(([subdomain, { tenantId, roles }]) => (
              <div
                key={tenantId}
                className="rounded-lg border bg-card p-5 space-y-3"
              >
                <h3 className="font-semibold">{subdomain}</h3>
                <p className="text-sm text-muted-foreground">
                  {roles.join(", ")}
                </p>
                <Link
                  href={buildTenantUrl(subdomain, host, "/admin")}
                  className="inline-block text-sm text-primary hover:underline"
                >
                  Ir al panel
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {memberOf.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Soy miembro</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberOf.map(([subdomain, { tenantId, roles }]) => (
              <div
                key={tenantId}
                className="rounded-lg border bg-card p-5 space-y-3"
              >
                <h3 className="font-semibold">{subdomain}</h3>
                <p className="text-sm text-muted-foreground">
                  {roles.join(", ")}
                </p>
                <Link
                  href={buildTenantUrl(subdomain, host, "/dashboard")}
                  className="inline-block text-sm text-primary hover:underline"
                >
                  Ver mi gym
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {allEntries.length === 0 && (
        <p className="text-muted-foreground">
          No tienes gimnasios asociados todavia.
        </p>
      )}
    </div>
  );
}
