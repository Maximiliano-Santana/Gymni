import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getSubdomain } from "@/features/tenants/lib";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getMemberDashboardData } from "@/features/members/server/dashboard";
import { AttendanceChart } from "./_components/charts";
import MemberQrCode from "./_components/MemberQrCode";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    ACTIVE: {
      label: "Activa",
      className: "bg-primary/10 text-primary border-primary/30",
    },
    PAST_DUE: {
      label: "Adeudo",
      className: "bg-destructive/10 text-destructive border-destructive/30",
    },
    CANCELED: {
      label: "Cancelada",
      className: "bg-muted text-muted-foreground border-border",
    },
  };
  const { label, className } = map[status] ?? map.CANCELED;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export default async function MemberDashboard() {
  const [session, sub] = await Promise.all([
    getServerSession(authOptions),
    getSubdomain(),
  ]);

  if (!session) redirect("/login");

  if (!sub) redirect("/app");

  const tenantInfo = session.user.tenants?.[sub];
  if (!tenantInfo) redirect("/login");

  const data = await getMemberDashboardData(
    session.user.id,
    tenantInfo.tenantId
  );

  if (!data) redirect("/login");

  const firstName = data.member.name?.split(" ")[0] ?? "Miembro";
  const diff = data.attendance.thisMonth - data.attendance.lastMonth;
  const diffLabel =
    diff > 0
      ? `+${diff} vs mes anterior`
      : diff < 0
        ? `${diff} vs mes anterior`
        : "Igual que mes anterior";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
      {/* Welcome + membership card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bienvenido, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {data.streak.current > 0
              ? `Llevas una racha de ${data.streak.current} día${data.streak.current !== 1 ? "s" : ""}. ¡Sigue así!`
              : "¡Hoy es un buen día para entrenar!"}
          </p>
        </div>

        {data.subscription ? (
          <Card className="sm:min-w-72 py-4">
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Membresía
                  </p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {data.subscription.planName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vence {formatDate(data.subscription.billingEndsAt)}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={data.subscription.status} />
                  <p className="text-2xl font-black text-primary mt-2">
                    {data.subscription.daysLeft}
                  </p>
                  <p className="text-xs text-muted-foreground">días restantes</p>
                </div>
              </div>
              {data.subscription.invoice && (
                <div
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    data.subscription.invoice.status === "paid"
                      ? "bg-primary/5 border-primary/20 text-primary"
                      : "bg-destructive/5 border-destructive/20 text-destructive"
                  }`}
                >
                  {data.subscription.invoice.status === "paid" ? (
                    <p className="font-medium">Al corriente</p>
                  ) : (
                    <>
                      <p className="font-medium">
                        Pago pendiente: {formatCurrency(data.subscription.invoice.amountCents, data.subscription.invoice.currency)}
                      </p>
                      {data.subscription.invoice.dueAt && (
                        <p className="mt-0.5 opacity-80">
                          Fecha límite: {formatDate(data.subscription.invoice.dueAt)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="sm:min-w-72 py-4">
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sin membresía activa
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Asistencias este mes</CardDescription>
            <CardTitle className="text-3xl font-black">
              {data.attendance.thisMonth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {diff > 0 && (
                <span className="text-primary text-xs font-medium">↑</span>
              )}
              {diff < 0 && (
                <span className="text-destructive text-xs font-medium">↓</span>
              )}
              {diff === 0 && (
                <span className="text-muted-foreground text-xs">→</span>
              )}
              {diffLabel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Racha actual</CardDescription>
            <CardTitle className="text-3xl font-black">
              {data.streak.current}d
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Récord: {data.streak.record} días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance chart */}
      <Card>
        <CardHeader>
          <CardTitle>Asistencias mensuales</CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceChart data={data.monthlyAttendance} />
        </CardContent>
      </Card>

      {/* Recent check-ins + QR */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Check-ins recientes
          </h2>
          <Card>
            {data.recentCheckIns.length > 0 ? (
              <>
                <div className="grid grid-cols-2 px-6 py-3 border-b bg-muted/40 rounded-t-xl">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Fecha
                  </p>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">
                    Hora
                  </p>
                </div>
                <CardContent className="p-0">
                  {data.recentCheckIns.map((ci, i) => (
                    <div key={ci.id}>
                      <div className="grid grid-cols-2 items-center px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          <p className="text-sm text-foreground">
                            {formatDate(ci.checkedInAt)}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground text-right">
                          {formatTime(ci.checkedInAt)}
                        </p>
                      </div>
                      {i < data.recentCheckIns.length - 1 && <Separator />}
                    </div>
                  ))}
                </CardContent>
              </>
            ) : (
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground text-center">
                  Aún no tienes check-ins registrados
                </p>
              </CardContent>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Mi QR</h2>
          <MemberQrCode size="sm" />
        </div>
      </div>
    </div>
  );
}
