"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Users,
  UserPlus,
  ScanLine,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
} from "recharts";

interface DashboardData {
  activeMembers: number;
  newMembersThisMonth: number;
  checkInsToday: number;
  monthlyRevenueCents: number;
  prevMonthRevenueCents: number;
  expiringSubs: number;
  revenueByDay: { date: string; totalCents: number }[];
  checkInsByDay: { date: string; count: number }[];
  membershipsByStatus: { status: string; count: number }[];
  revenueByPlan: { plan: string; totalCents: number }[];
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);

const formatDateTick = (v: string) => {
  const [, m, d] = v.split("-");
  return `${parseInt(d)}/${parseInt(m)}`;
};

const DONUT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const revenueChartConfig: ChartConfig = {
  totalCents: { label: "Ingresos", color: "var(--chart-1)" },
};

const checkInsChartConfig: ChartConfig = {
  count: { label: "Check-ins", color: "var(--chart-2)" },
};

export default function AdminDashboard({ data }: { data: DashboardData }) {
  // Revenue comparison
  const revDiff =
    data.prevMonthRevenueCents > 0
      ? Math.round(
          ((data.monthlyRevenueCents - data.prevMonthRevenueCents) /
            data.prevMonthRevenueCents) *
            100
        )
      : null;

  const kpis = [
    {
      title: "Miembros activos",
      value: data.activeMembers,
      icon: Users,
    },
    {
      title: "Nuevos este mes",
      value: `+${data.newMembersThisMonth}`,
      icon: UserPlus,
    },
    {
      title: "Check-ins hoy",
      value: data.checkInsToday,
      icon: ScanLine,
    },
    {
      title: "Ingresos del mes",
      value: formatMoney(data.monthlyRevenueCents),
      icon: DollarSign,
      extra: revDiff !== null ? revDiff : undefined,
    },
    {
      title: "Por vencer (7 días)",
      value: data.expiringSubs,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-5">
        {kpis.map((kpi, i) => (
          <Card
            key={kpi.title}
            className={`py-3 px-4 gap-1 md:py-6 md:gap-6 ${
              i === kpis.length - 1 ? "col-span-2 lg:col-span-1" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between p-0">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="size-3.5 md:size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-lg md:text-2xl font-bold">{kpi.value}</p>
              {kpi.extra !== undefined && (
                <p
                  className={`text-xs flex items-center gap-0.5 ${
                    kpi.extra >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {kpi.extra >= 0 ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {kpi.extra >= 0 ? "+" : ""}
                  {kpi.extra}% vs mes anterior
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Time-series charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue by day */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos diarios
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {data.revenueByDay.length > 0 ? (
              <ChartContainer
                config={revenueChartConfig}
                className="h-[200px] w-full aspect-auto"
              >
                <AreaChart
                  data={data.revenueByDay.map((d) => ({
                    ...d,
                    totalCents: d.totalCents / 100,
                  }))}
                >
                  <defs>
                    <linearGradient
                      id="revGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateTick}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={formatDateTick}
                        formatter={(value) =>
                          formatMoney(Number(value) * 100)
                        }
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="totalCents"
                    stroke="var(--chart-1)"
                    fill="url(#revGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin ingresos este mes
              </p>
            )}
          </CardContent>
        </Card>

        {/* Check-ins by day */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Check-ins del mes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {data.checkInsByDay.length > 0 ? (
              <ChartContainer
                config={checkInsChartConfig}
                className="h-[200px] w-full aspect-auto"
              >
                <BarChart data={data.checkInsByDay}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateTick}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent labelFormatter={formatDateTick} />
                    }
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--chart-2)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin check-ins este mes
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Donut charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Membership status */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Membresías por estado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {data.membershipsByStatus.length > 0 ? (
              <div className="flex items-center gap-4">
                <ChartContainer
                  config={Object.fromEntries(
                    data.membershipsByStatus.map((s, i) => [
                      s.status,
                      { label: s.status, color: DONUT_COLORS[i % DONUT_COLORS.length] },
                    ])
                  )}
                  className="h-[160px] w-[160px] shrink-0"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={data.membershipsByStatus}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={45}
                      outerRadius={70}
                      strokeWidth={2}
                    >
                      {data.membershipsByStatus.map((_, i) => (
                        <Cell
                          key={i}
                          fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-col gap-2 text-sm">
                  {data.membershipsByStatus.map((s, i) => (
                    <div key={s.status} className="flex items-center gap-2">
                      <div
                        className="size-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            DONUT_COLORS[i % DONUT_COLORS.length],
                        }}
                      />
                      <span className="text-muted-foreground">{s.status}</span>
                      <span className="font-medium ml-auto">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin datos
              </p>
            )}
          </CardContent>
        </Card>

        {/* Revenue by plan */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos por plan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {data.revenueByPlan.length > 0 ? (
              <div className="flex items-center gap-4">
                <ChartContainer
                  config={Object.fromEntries(
                    data.revenueByPlan.map((r, i) => [
                      r.plan,
                      { label: r.plan, color: DONUT_COLORS[i % DONUT_COLORS.length] },
                    ])
                  )}
                  className="h-[160px] w-[160px] shrink-0"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            formatMoney(Number(value))
                          }
                        />
                      }
                    />
                    <Pie
                      data={data.revenueByPlan.map((r) => ({
                        ...r,
                        totalCents: r.totalCents / 100,
                      }))}
                      dataKey="totalCents"
                      nameKey="plan"
                      innerRadius={45}
                      outerRadius={70}
                      strokeWidth={2}
                    >
                      {data.revenueByPlan.map((_, i) => (
                        <Cell
                          key={i}
                          fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-col gap-2 text-sm">
                  {data.revenueByPlan.map((r, i) => (
                    <div key={r.plan} className="flex items-center gap-2">
                      <div
                        className="size-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            DONUT_COLORS[i % DONUT_COLORS.length],
                        }}
                      />
                      <span className="text-muted-foreground">{r.plan}</span>
                      <span className="font-medium ml-auto">
                        {formatMoney(r.totalCents)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin ingresos este mes
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
