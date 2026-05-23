import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw } from "lucide-react";
import { getLogs } from "@/api/client";
import type { LogsResponse, LogEntry } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimeRangeSelector, RANGES, rangeToParams } from "@/components/TimeRangeSelector";
import type { TimeRange } from "@/components/TimeRangeSelector";
import { format, parseISO } from "date-fns";

function ProtoBadge({ proto }: { proto: string }) {
  const color: Record<string, string> = {
    tcp: "bg-blue-500/10 text-blue-700",
    udp: "bg-amber-500/10 text-amber-700",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${color[proto] ?? "bg-muted text-muted-foreground"}`}>
      {proto}
    </span>
  );
}

export function LogsPage() {
  const [range, setRange] = useState<TimeRange>(RANGES[1]);
  const [userFilter, setUserFilter] = useState("");
  const [destFilter, setDestFilter] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;

  const params = {
    ...rangeToParams(range),
    user_email: userFilter,
    dest_host: destFilter,
    page: String(page),
    page_size: String(PAGE_SIZE),
  };

  const { data, isLoading, refetch, isFetching } = useQuery<LogsResponse>({
    queryKey: ["logs", params],
    queryFn: () => getLogs(params),
    refetchInterval: 15_000,
  });

  const entries: LogEntry[] = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleFilter = () => {
    setPage(1);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Логи</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString("ru-RU")} записей
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TimeRangeSelector value={range} onChange={(r) => { setRange(r); setPage(1); }} />
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Фильтр по пользователю..."
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFilter()}
          />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Фильтр по домену..."
            value={destFilter}
            onChange={(e) => setDestFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFilter()}
          />
        </div>
        <Button onClick={handleFilter}>Применить</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Нет записей за выбранный период
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Время</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Пользователь</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Источник</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Протокол</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Назначение</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Inbound → Outbound</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2 font-mono text-muted-foreground whitespace-nowrap">
                        {format(parseISO(e.timestamp), "dd.MM HH:mm:ss")}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="secondary">{e.user_email || "—"}</Badge>
                      </td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">
                        {e.source_ip}:{e.source_port}
                      </td>
                      <td className="px-4 py-2">
                        <ProtoBadge proto={e.dest_protocol} />
                      </td>
                      <td className="px-4 py-2 font-mono font-medium">
                        {e.dest_host}:{e.dest_port}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        <span className="text-foreground">{e.inbound}</span>
                        {" → "}
                        {e.outbound}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Стр. {page} из {totalPages} ({total.toLocaleString("ru-RU")} записей)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
