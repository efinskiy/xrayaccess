import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";
import { getTopUsers } from "@/api/client";
import type { UserStat } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeRangeSelector, RANGES, rangeToParams } from "@/components/TimeRangeSelector";
import type { TimeRange } from "@/components/TimeRangeSelector";
import { formatNumber } from "@/lib/utils";

export function UsersPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<TimeRange>(RANGES[1]);
  const [search, setSearch] = useState("");
  const params = rangeToParams(range);

  const { data: users = [], isLoading } = useQuery<UserStat[]>({
    queryKey: ["users", params],
    queryFn: () => getTopUsers(params),
    refetchInterval: 30_000,
  });

  const filtered = users.filter((u) =>
    u.user_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Пользователи</h1>
          <p className="text-sm text-muted-foreground">Статистика по email (user_id)</p>
        </div>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            {filtered.length} пользователей
          </CardTitle>
          <Input
            placeholder="Поиск по email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Нет данных</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-6 py-3 font-medium text-muted-foreground">#</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">Пользователь</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground text-right">Запросы</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground text-right">Уникальных сайтов</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr
                    key={u.user_email}
                    className="border-b transition-colors hover:bg-muted/30"
                  >
                    <td className="px-6 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary">{u.user_email}</Badge>
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-medium">
                      {formatNumber(u.requests)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-muted-foreground">
                      {formatNumber(u.unique_dests)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/users/${encodeURIComponent(u.user_email)}`)}
                      >
                        Подробнее
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
