import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Globe, Server, Users } from "lucide-react";
import { getOverview, getTimeline, getTopDestinations, getInboundStats } from "@/api/client";
import type { OverviewStats, TimelineBucket, DestStat, InboundStat } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimelineChart } from "@/components/charts/TimelineChart";
import { TopDestinationsChart } from "@/components/charts/TopDestinationsChart";
import { TimeRangeSelector, RANGES, rangeToParams } from "@/components/TimeRangeSelector";
import type { TimeRange } from "@/components/TimeRangeSelector";
import { formatNumber } from "@/lib/utils";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

const INBOUND_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#60a5fa"];

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === "number" ? formatNumber(value) : value}</div>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const [range, setRange] = useState<TimeRange>(RANGES[1]);
  const params = rangeToParams(range);

  const { data: overview } = useQuery<OverviewStats>({
    queryKey: ["overview", params],
    queryFn: () => getOverview(params),
    refetchInterval: 30_000,
  });

  const { data: timeline = [] } = useQuery<TimelineBucket[]>({
    queryKey: ["timeline", params],
    queryFn: () => getTimeline(params),
    refetchInterval: 30_000,
  });

  const { data: destinations = [] } = useQuery<DestStat[]>({
    queryKey: ["destinations", params],
    queryFn: () => getTopDestinations(params),
  });

  const { data: inbounds = [] } = useQuery<InboundStat[]>({
    queryKey: ["inbounds", params],
    queryFn: () => getInboundStats(params),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Дашборд</h1>
          <p className="text-sm text-muted-foreground">Статистика Xray прокси</p>
        </div>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Всего запросов"
          value={overview?.total_requests ?? 0}
          icon={Activity}
        />
        <StatCard
          title="Уникальных пользователей"
          value={overview?.unique_users ?? 0}
          icon={Users}
        />
        <StatCard
          title="Уникальных сайтов"
          value={overview?.unique_dests ?? 0}
          icon={Globe}
        />
        <StatCard
          title="Активных серверов"
          value={overview?.active_servers ?? 0}
          icon={Server}
        />
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Трафик по времени</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              Нет данных за выбранный период
            </div>
          ) : (
            <TimelineChart data={timeline} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top destinations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Топ направлений</CardTitle>
          </CardHeader>
          <CardContent>
            {destinations.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                Нет данных
              </div>
            ) : (
              <TopDestinationsChart data={destinations} />
            )}
          </CardContent>
        </Card>

        {/* Inbound distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Распределение по inbound</CardTitle>
          </CardHeader>
          <CardContent>
            {inbounds.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                Нет данных
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={inbounds}
                    dataKey="requests"
                    nameKey="inbound"
                    cx="50%"
                    cy="45%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {inbounds.map((_, i) => (
                      <Cell key={i} fill={INBOUND_COLORS[i % INBOUND_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [v.toLocaleString("ru-RU"), "Запросы"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
