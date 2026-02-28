"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// ── Datos ─────────────────────────────────────────────────────────────────────

const attendanceData = [
  { mes: "Sep", asistencias: 14, meta: 20 },
  { mes: "Oct", asistencias: 19, meta: 20 },
  { mes: "Nov", asistencias: 11, meta: 20 },
  { mes: "Dic", asistencias: 8,  meta: 20 },
  { mes: "Ene", asistencias: 22, meta: 24 },
  { mes: "Feb", asistencias: 18, meta: 24 },
];

const activityData = [
  { tipo: "CrossFit", sesiones: 8, calorias: 4960 },
  { tipo: "Spinning", sesiones: 5, calorias: 2400 },
  { tipo: "Yoga",     sesiones: 4, calorias:  840 },
  { tipo: "Pilates",  sesiones: 3, calorias:  870 },
  { tipo: "Cardio",   sesiones: 2, calorias:  920 },
];

const caloriesData = [
  { semana: "S1", calorias: 1840, objetivo: 2000 },
  { semana: "S2", calorias: 2100, objetivo: 2000 },
  { semana: "S3", calorias: 960,  objetivo: 2000 },
  { semana: "S4", calorias: 2340, objetivo: 2000 },
  { semana: "S5", calorias: 1780, objetivo: 2000 },
  { semana: "S6", calorias: 2200, objetivo: 2000 },
  { semana: "S7", calorias: 2480, objetivo: 2000 },
  { semana: "S8", calorias: 1840, objetivo: 2000 },
];

const membershipData = [
  { name: "Premium", value: 42, fill: "var(--color-premium)" },
  { name: "Básico",  value: 31, fill: "var(--color-basico)" },
  { name: "Trial",   value: 15, fill: "var(--color-trial)" },
  { name: "Anual",   value: 12, fill: "var(--color-anual)" },
];

// ── Configs ───────────────────────────────────────────────────────────────────

const attendanceConfig = {
  asistencias: { label: "Asistencias", color: "var(--color-primary)" },
  meta:        { label: "Meta",        color: "var(--color-secondary)" },
} satisfies ChartConfig;

const activityConfig = {
  sesiones:  { label: "Sesiones",  color: "var(--color-primary)" },
  calorias:  { label: "Calorías",  color: "var(--color-secondary)" },
} satisfies ChartConfig;

const caloriesConfig = {
  calorias:  { label: "Calorías quemadas", color: "var(--color-primary)" },
  objetivo:  { label: "Objetivo",          color: "var(--color-secondary)" },
} satisfies ChartConfig;

const membershipConfig = {
  premium: { label: "Premium", color: "var(--color-chart-1)" },
  basico:  { label: "Básico",  color: "var(--color-chart-2)" },
  trial:   { label: "Trial",   color: "var(--color-chart-3)" },
  anual:   { label: "Anual",   color: "var(--color-chart-4)" },
} satisfies ChartConfig;

// ── Componentes ───────────────────────────────────────────────────────────────

export function AttendanceChart() {
  return (
    <ChartContainer config={attendanceConfig} className="h-[220px] w-full">
      <AreaChart data={attendanceData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="fillAsistencias" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--color-primary)"   stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-primary)"   stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillMeta" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--color-secondary)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="meta"
          stroke="var(--color-secondary)"
          strokeWidth={2}
          strokeDasharray="4 4"
          fill="url(#fillMeta)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="asistencias"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#fillAsistencias)"
          dot={{ fill: "var(--color-primary)", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function ActivityChart() {
  return (
    <ChartContainer config={activityConfig} className="h-[220px] w-full">
      <BarChart data={activityData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="tipo" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="sesiones" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function CaloriesChart() {
  return (
    <ChartContainer config={caloriesConfig} className="h-[220px] w-full">
      <LineChart data={caloriesData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="semana" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="objetivo"
          stroke="var(--color-secondary)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="calorias"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={{ fill: "var(--color-primary)", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

export function MembershipPieChart() {
  return (
    <ChartContainer config={membershipConfig} className="h-[220px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={membershipData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          strokeWidth={0}
        >
          {membershipData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          payload={membershipData.map((d) => ({
            value: d.name,
            type: "square" as const,
            color: d.fill,
            dataKey: d.name.toLowerCase().replace("á", "a"),
          }))}
        />
      </PieChart>
    </ChartContainer>
  );
}
