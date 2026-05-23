import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import type {
  LoginResponse,
  Server,
  ServerCreated,
  OverviewStats,
  UserStat,
  UserDetail,
  DestStat,
  TimelineBucket,
  InboundStat,
  LogsResponse,
} from "./types";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

// Go сериализует nil-слайсы как null — нормализуем в []
const toArr = <T>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

// Auth
export const login = (username: string, password: string): Promise<LoginResponse> =>
  api.post("/auth/login", { username, password }).then((r) => r.data as LoginResponse);

// Servers
export const getServers = (): Promise<Server[]> =>
  api.get("/servers").then((r) => toArr<Server>(r.data));
export const createServer = (name: string): Promise<ServerCreated> =>
  api.post("/servers", { name }).then((r) => r.data as ServerCreated);
export const deleteServer = (id: string) => api.delete(`/servers/${id}`);

// Stats
export const getOverview = (params?: Record<string, string>): Promise<OverviewStats> =>
  api.get("/stats/overview", { params }).then((r) => r.data as OverviewStats);
export const getTopUsers = (params?: Record<string, string>): Promise<UserStat[]> =>
  api.get("/stats/users", { params }).then((r) => toArr<UserStat>(r.data));
export const getUserDetail = (email: string, params?: Record<string, string>): Promise<UserDetail> =>
  api.get(`/stats/users/${encodeURIComponent(email)}`, { params }).then((r) => r.data as UserDetail);
export const getTopDestinations = (params?: Record<string, string>): Promise<DestStat[]> =>
  api.get("/stats/destinations", { params }).then((r) => toArr<DestStat>(r.data));
export const getTimeline = (params?: Record<string, string>): Promise<TimelineBucket[]> =>
  api.get("/stats/timeline", { params }).then((r) => toArr<TimelineBucket>(r.data));
export const getInboundStats = (params?: Record<string, string>): Promise<InboundStat[]> =>
  api.get("/stats/inbound", { params }).then((r) => toArr<InboundStat>(r.data));

// Logs
export const getLogs = (params?: Record<string, string | number>): Promise<LogsResponse> =>
  api.get("/logs", { params }).then((r) => ({
    ...(r.data as LogsResponse),
    entries: toArr<LogsResponse["entries"][number]>(r.data?.entries),
  }));
