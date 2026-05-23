import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DestStat } from "@/api/types";

const COLORS = [
  "hsl(var(--primary))",
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#818cf8",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f87171",
];

interface Props {
  data: DestStat[];
  limit?: number;
}

export function TopDestinationsChart({ data, limit = 10 }: Props) {
  const sliced = data.slice(0, limit);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sliced} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="dest_host"
          width={160}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: 12,
          }}
          formatter={(v: number) => [v.toLocaleString("ru-RU"), "Запросы"]}
        />
        <Bar dataKey="requests" radius={[0, 4, 4, 0]}>
          {sliced.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
