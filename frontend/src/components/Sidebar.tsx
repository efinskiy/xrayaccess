import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Server,
  ScrollText,
  Shield,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Separator } from "./ui/separator";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Дашборд" },
  { to: "/users", icon: Users, label: "Пользователи" },
  { to: "/servers", icon: Server, label: "Серверы" },
  { to: "/logs", icon: ScrollText, label: "Логи" },
];

export function Sidebar() {
  const { username, logout } = useAuthStore();

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-card">
      <div className="flex items-center gap-2 px-5 py-5">
        <Shield className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg tracking-tight">Xray Dashboard</span>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      <div className="px-4 py-4">
        <div className="mb-2 text-xs text-muted-foreground truncate">{username}</div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
