import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Server, Copy, Check, Wifi, WifiOff } from "lucide-react";
import { getServers, createServer, deleteServer } from "@/api/client";
import type { Server as ServerType, ServerCreated } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copy}>
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000;
}

export function ServersPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newKeyInfo, setNewKeyInfo] = useState<ServerCreated | null>(null);
  const [name, setName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: servers = [], isLoading } = useQuery<ServerType[]>({
    queryKey: ["servers"],
    queryFn: getServers,
    refetchInterval: 15_000,
  });

  const addMutation = useMutation({
    mutationFn: () => createServer(name),
    onSuccess: (data: ServerCreated) => {
      qc.invalidateQueries({ queryKey: ["servers"] });
      setNewKeyInfo(data);
      setName("");
      setAddOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteServer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servers"] });
      setDeleteId(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Серверы</h1>
          <p className="text-sm text-muted-foreground">Xray ноды, подключённые к дашборду</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить сервер
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" />
            {servers.length} серверов
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : servers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Нет серверов. Добавьте первый сервер и установите агент.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-6 py-3 font-medium text-muted-foreground">Статус</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">Имя</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">IP адрес</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">Последнее подключение</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground text-right"></th>
                </tr>
              </thead>
              <tbody>
                {servers.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3">
                      {isOnline(s.last_seen_at) ? (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <Wifi className="h-4 w-4" />
                          <span className="text-xs font-medium">Online</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <WifiOff className="h-4 w-4" />
                          <span className="text-xs font-medium">Offline</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 font-medium">{s.name}</td>
                    <td className="px-6 py-3 font-mono text-muted-foreground">
                      {s.ip_address || "—"}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {s.last_seen_at
                        ? formatDistanceToNow(parseISO(s.last_seen_at), {
                            addSuffix: true,
                            locale: ru,
                          })
                        : "Никогда"}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add server dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить сервер</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Название сервера</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VPS-Frankfurt-01"
              onKeyDown={(e) => e.key === "Enter" && addMutation.mutate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!name || addMutation.isPending}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New API key dialog */}
      <Dialog open={!!newKeyInfo} onOpenChange={() => setNewKeyInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сервер создан — сохраните API ключ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ключ показывается только один раз. Скопируйте и вставьте в <code>config.yaml</code> агента.
          </p>
          <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
            <code className="flex-1 break-all text-xs">{newKeyInfo?.api_key}</code>
            <CopyButton text={newKeyInfo?.api_key ?? ""} />
          </div>
          <div className="rounded-md bg-muted p-3 text-xs font-mono text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">config.yaml:</p>
            <p>server_url: https://your-dashboard.example.com</p>
            <p>api_key: {newKeyInfo?.api_key}</p>
            <p>log_file: /var/log/xray/access.log</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKeyInfo(null)}>Готово</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить сервер?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Все логи этого сервера останутся в базе. API ключ будет деактивирован.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Отмена</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
