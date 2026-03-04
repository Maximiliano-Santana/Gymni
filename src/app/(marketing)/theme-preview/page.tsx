"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AttendanceChart,
} from "../../(tenant)/(user)/dashboard/_components/charts";

const MOCK_ATTENDANCE = [
  { mes: "Sep", asistencias: 14 },
  { mes: "Oct", asistencias: 19 },
  { mes: "Nov", asistencias: 11 },
  { mes: "Dic", asistencias: 8 },
  { mes: "Ene", asistencias: 22 },
  { mes: "Feb", asistencias: 18 },
];

// ── Tenant options ───────────────────────────────────────────────────────────

const TENANTS = [
  { label: "Default (naranja / light)", value: "" },
  { label: "Dev Gym (morado / dark)", value: "dev-gym" },
  { label: "Green Gym (verde / light)", value: "green-gym" },
];

// ── Mocked data (same as dashboard) ──────────────────────────────────────────

const MEMBER = {
  name: "Tasha María",
  plan: "Premium",
  status: "active" as const,
  memberSince: "Enero 2024",
  expiresAt: "28 Mar 2026",
  daysLeft: 28,
};

const STATS = [
  { label: "Asistencias este mes", value: "18", sub: "+3 vs mes anterior", trend: "up" },
  { label: "Clases reservadas",    value: "6",  sub: "2 esta semana",      trend: "up" },
  { label: "Racha actual",         value: "12d", sub: "Récord: 21 días",   trend: "neutral" },
  { label: "Calorías quemadas",    value: "9,240", sub: "kcal estimadas",  trend: "up" },
];

const UPCOMING_CLASSES = [
  { name: "Spinning Intensivo", trainer: "Carlos M.", time: "Hoy, 7:00 PM",   spots: 3, total: 20 },
  { name: "Yoga Flow",          trainer: "Ana R.",    time: "Mañana, 8:00 AM", spots: 8, total: 15 },
  { name: "CrossFit WOD",       trainer: "Luis T.",   time: "Mié, 6:30 AM",   spots: 1, total: 12 },
  { name: "Pilates Core",       trainer: "Sofía G.",  time: "Jue, 9:00 AM",   spots: 5, total: 10 },
];

const RECENT_ACTIVITY = [
  { activity: "CrossFit WOD", date: "Hoy",    duration: "55 min", calories: 620 },
  { activity: "Spinning",     date: "Ayer",   duration: "45 min", calories: 480 },
  { activity: "Yoga Flow",    date: "Lun 24", duration: "60 min", calories: 210 },
  { activity: "Pilates",      date: "Sáb 22", duration: "50 min", calories: 290 },
  { activity: "CrossFit WOD", date: "Vie 21", duration: "55 min", calories: 590 },
];

const GOALS = [
  { label: "Asistencias mensuales", current: 18, target: 24, unit: "días" },
  { label: "Cardio semanal",        current: 3,  target: 4,  unit: "sesiones" },
  { label: "Clases grupales",       current: 6,  target: 8,  unit: "clases" },
];

const QUICK_ACTIONS = [
  { label: "Reservar clase",  variant: "default"   as const },
  { label: "Ver horarios",    variant: "outline"   as const },
  { label: "Mi progreso",     variant: "outline"   as const },
  { label: "Nutrición",       variant: "secondary" as const },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "active" | "expiring" | "expired" }) {
  const map = {
    active:   { label: "Activa",      className: "bg-success/15 text-success border-success/30" },
    expiring: { label: "Por vencer",  className: "bg-warning/15 text-warning border-warning/30" },
    expired:  { label: "Vencida",     className: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const { label, className } = map[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up")   return <span className="text-success text-xs font-medium">↑</span>;
  if (trend === "down") return <span className="text-destructive text-xs font-medium">↓</span>;
  return <span className="text-muted-foreground text-xs">→</span>;
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min(Math.round((current / target) * 100), 100);
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ThemePreviewPage() {
  const [tenant, setTenant] = useState("");

  useEffect(() => {
    const url = tenant
      ? `/api/tenants/theme?tenant=${tenant}`
      : `/api/tenants/theme`;

    // Swap the theme stylesheet
    let link = document.getElementById("theme-preview-css") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = "theme-preview-css";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = url;

    // Handle dark mode class on html
    const darkTenants = ["dev-gym"];
    document.documentElement.classList.toggle("dark", darkTenants.includes(tenant));
  }, [tenant]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">

      {/* Tenant selector bar */}
      <div className="sticky top-0 z-50 border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-foreground">Theme Preview</p>
          <select
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
          >
            {TENANTS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-muted-foreground">
          {tenant || "default"} · cambiar para ver otro tema
        </p>
      </div>

      {/* Top nav (from dashboard) */}
      <header className="sticky top-[53px] z-10 border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            TM
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">{MEMBER.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{MEMBER.plan} · {MEMBER.memberSince}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">Horarios</Button>
          <Button variant="ghost" size="sm">Mi perfil</Button>
          <Button size="sm">Reservar clase</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">

        {/* Welcome + membership banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Bienvenida, {MEMBER.name.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Viernes 28 de febrero, 2026 · Llevas una racha de 12 días.
            </p>
          </div>
          <Card className="sm:min-w-72 py-4">
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Membresía</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{MEMBER.plan}</p>
                <p className="text-xs text-muted-foreground">Vence {MEMBER.expiresAt}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={MEMBER.status} />
                <p className="text-2xl font-black text-primary mt-2">{MEMBER.daysLeft}</p>
                <p className="text-xs text-muted-foreground">días restantes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat) => (
            <Card key={stat.label}>
              <CardHeader>
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-3xl font-black">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendIcon trend={stat.trend} />
                  {stat.sub}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Attendance chart */}
        <Card>
          <CardHeader>
            <CardTitle>Asistencias mensuales</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceChart data={MOCK_ATTENDANCE} />
          </CardContent>
        </Card>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Upcoming classes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Próximas clases</h2>
              <Button variant="ghost" size="sm" className="text-xs">Ver todas →</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                {UPCOMING_CLASSES.map((cls, i) => (
                  <div key={cls.name}>
                    <div className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-sm">{cls.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{cls.name}</p>
                          <p className="text-xs text-muted-foreground">{cls.trainer} · {cls.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">{cls.spots} lugares</p>
                          <p className="text-xs text-muted-foreground">de {cls.total}</p>
                        </div>
                        <Button size="sm" variant={cls.spots <= 2 ? "default" : "outline"}>
                          {cls.spots <= 2 ? "¡Último!" : "Reservar"}
                        </Button>
                      </div>
                    </div>
                    {i < UPCOMING_CLASSES.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Goals + quick actions */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Mis metas</h2>
            <Card>
              <CardContent className="space-y-5 pt-2">
                {GOALS.map((goal) => {
                  const pct = Math.round((goal.current / goal.target) * 100);
                  return (
                    <div key={goal.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-foreground">{goal.label}</p>
                        <p className="text-xs font-medium text-primary">
                          {goal.current}/{goal.target} {goal.unit}
                        </p>
                      </div>
                      <ProgressBar current={goal.current} target={goal.target} />
                      <p className="text-xs text-muted-foreground text-right">{pct}%</p>
                    </div>
                  );
                })}
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button variant="outline" size="sm" className="w-full">Editar metas</Button>
              </CardFooter>
            </Card>

            <h2 className="text-base font-semibold text-foreground">Acciones rápidas</h2>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Button key={action.label} variant={action.variant} size="sm" className="h-12 text-xs">
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Actividad reciente</h2>
            <Button variant="ghost" size="sm" className="text-xs">Ver historial →</Button>
          </div>
          <Card>
            <div className="grid grid-cols-4 px-6 py-3 border-b bg-muted/40 rounded-t-xl">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actividad</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duración</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Calorías</p>
            </div>
            <CardContent className="p-0">
              {RECENT_ACTIVITY.map((item, i) => (
                <div key={i}>
                  <div className="grid grid-cols-4 items-center px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-success flex-shrink-0" />
                      <p className="text-sm font-medium text-foreground">{item.activity}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                    <p className="text-sm text-muted-foreground">{item.duration}</p>
                    <p className="text-sm font-medium text-foreground text-right">{item.calories} kcal</p>
                  </div>
                  {i < RECENT_ACTIVITY.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Paleta de colores ─────────────────────────────────────── */}
        <Separator />
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Paleta de colores</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tokens semánticos shadcn + gray scale del tenant. Variantes via opacidad de Tailwind.
            </p>
          </div>

          {/* Semantic color swatches */}
          <Card>
            <CardHeader>
              <CardTitle>Tokens semánticos</CardTitle>
              <CardDescription>Los colores que shadcn y tus componentes consumen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {[
                  { name: "primary",     cls: "bg-primary" },
                  { name: "secondary",   cls: "bg-secondary" },
                  { name: "accent",      cls: "bg-accent" },
                  { name: "muted",       cls: "bg-muted" },
                  { name: "destructive", cls: "bg-destructive" },
                  { name: "success",     cls: "bg-success" },
                  { name: "background",  cls: "bg-background" },
                  { name: "card",        cls: "bg-card" },
                  { name: "popover",     cls: "bg-popover" },
                  { name: "border",      cls: "bg-border" },
                  { name: "input",       cls: "bg-input" },
                  { name: "ring",        cls: "bg-ring" },
                ].map((s) => (
                  <div key={s.name} className="flex flex-col items-center gap-2">
                    <div className={`h-12 w-full rounded-lg border ${s.cls}`} />
                    <p className="text-[10px] text-muted-foreground font-mono">{s.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Opacity variants */}
          <Card>
            <CardHeader>
              <CardTitle>Variantes con opacidad</CardTitle>
              <CardDescription>Cómo shadcn y Tailwind generan hover, focus, etc.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((o) => (
                  <div key={o} className="flex flex-col items-center gap-2">
                    <div className={`h-12 w-full rounded-lg border bg-primary/${o}`} />
                    <p className="text-[10px] text-muted-foreground font-mono">/{o}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Use cases */}
          <Card>
            <CardHeader>
              <CardTitle>Ejemplos de uso</CardTitle>
              <CardDescription>Patrones comunes usando opacidad de Tailwind</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Buttons */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Botones con hover via opacidad</p>
                <div className="flex flex-wrap gap-3">
                  <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    primary (hover /90)
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
                    secondary (hover /80)
                  </button>
                  <Button variant="destructive">destructive</Button>
                  <Button variant="outline">outline</Button>
                  <Button variant="ghost">ghost</Button>
                </div>
              </div>

              {/* Banners */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Banners</p>
                <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Membresía renovada</p>
                  <p className="text-xs text-muted-foreground mt-0.5">bg-primary/10, border-primary/20</p>
                </div>
                <div className="rounded-lg border border-secondary/20 bg-secondary/10 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Clase confirmada</p>
                  <p className="text-xs text-muted-foreground mt-0.5">bg-secondary/10, border-secondary/20</p>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-primary/15 text-primary px-2.5 py-0.5 text-xs font-medium">
                    CrossFit
                  </span>
                  <span className="inline-flex items-center rounded-full bg-secondary/15 text-secondary px-2.5 py-0.5 text-xs font-medium">
                    Yoga
                  </span>
                  <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-medium">
                    Premium
                  </span>
                  <span className="inline-flex items-center rounded-full bg-destructive/15 text-destructive px-2.5 py-0.5 text-xs font-medium">
                    Vencida
                  </span>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Gray scale */}
          <Card>
            <CardHeader>
              <CardTitle>Gray Scale</CardTitle>
              <CardDescription>Escala de grises derivada del grayBase del tenant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
                {[
                  { name: "100", cls: "bg-gray-100" },
                  { name: "200", cls: "bg-gray-200" },
                  { name: "300", cls: "bg-gray-300" },
                  { name: "400", cls: "bg-gray-400" },
                  { name: "500", cls: "bg-gray-500" },
                  { name: "600", cls: "bg-gray-600" },
                  { name: "700", cls: "bg-gray-700" },
                  { name: "800", cls: "bg-gray-800" },
                  { name: "900", cls: "bg-gray-900" },
                ].map((g) => (
                  <div key={g.name} className="flex flex-col items-center gap-1">
                    <div className={`h-10 w-full rounded-md border ${g.cls}`} />
                    <p className="text-[9px] text-muted-foreground font-mono">{g.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chart colors */}
          <Card>
            <CardHeader>
              <CardTitle>Chart Colors</CardTitle>
              <CardDescription>Derivados del primary por rotación de hue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { name: "chart-1", cls: "bg-chart-1" },
                  { name: "chart-2", cls: "bg-chart-2" },
                  { name: "chart-3", cls: "bg-chart-3" },
                  { name: "chart-4", cls: "bg-chart-4" },
                  { name: "chart-5", cls: "bg-chart-5" },
                ].map((c) => (
                  <div key={c.name} className="flex flex-col items-center gap-2">
                    <div className={`h-12 w-full rounded-lg border ${c.cls}`} />
                    <p className="text-[10px] text-muted-foreground font-mono">{c.name.replace("chart-","")}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
}
