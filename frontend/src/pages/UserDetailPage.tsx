import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Globe, Activity } from "lucide-react";
import { getUserDetail, getTopDestinations, getTimeline } from "@/api/client";
import type { UserDetail, DestStat, TimelineBucket } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimelineChart } from "@/components/charts/TimelineChart";
import { TopDestinationsChart } from "@/components/charts/TopDestinationsChart";
import { TimeRangeSelector, RANGES, rangeToParams } from "@/components/TimeRangeSelector";
import type { TimeRange } from "@/components/TimeRangeSelector";
import { formatNumber } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export function UserDetailPage() {
  const { email } = useParams<{ email: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<TimeRange>(RANGES[1]);
  const params = { ...rangeToParams(range), user_email: email ?? "" };

  const { data: detail } = useQuery<UserDetail>({
    queryKey: ["user-detail", email, params],
    queryFn: () => getUserDetail(email!, rangeToParams(range)),
    enabled: !!email,
  });

  const { data: destinations = [] } = useQuery<DestStat[]>({
    queryKey: ["user-dests", email, params],
    queryFn: () => getTopDestinations(params),
    enabled: !!email,
  });

  const { data: timeline = [] } = useQuery<TimelineBucket[]>({
    queryKey: ["user-timeline", email, params],
    queryFn: () => getTimeline(params),
    enabled: !!email,
  });

  const decodedEmail = decodeURIComponent(email ?? "");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Пользователь</h1>
            <Badge>{decodedEmail}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {detail?.first_seen
              ? `Первый запрос: ${format(parseISO(detail.first_seen), "d MMM yyyy HH:mm", { locale: ru })}`
              : ""}
          </p>
        </div>
        <div className="ml-auto">
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Запросов</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(detail?.requests ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Уникальных сайтов</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(detail?.unique_dests ?? 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Активность по времени</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              Нет данных
            </div>
          ) : (
            <TimelineChart data={timeline} />
          )}
        </CardContent>
      </Card>

      {/* Top destinations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Топ направлений пользователя</CardTitle>
        </CardHeader>
        <CardContent>
          {destinations.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              Нет данных
            </div>
          ) : (
            <TopDestinationsChart data={destinations} limit={15} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
