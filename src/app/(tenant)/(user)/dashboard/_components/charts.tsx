"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const attendanceConfig = {
  asistencias: { label: "Asistencias", color: "var(--color-primary)" },
} satisfies ChartConfig;

export function AttendanceChart({
  data,
}: {
  data: { mes: string; asistencias: number }[];
}) {
  return (
    <ChartContainer config={attendanceConfig} className="h-[220px] w-full">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="fillAsistencias" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} />
        <ChartTooltip content={<ChartTooltipContent />} />
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
