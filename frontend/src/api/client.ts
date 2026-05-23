import axios from "axios";
import { useAuthStore } from "@/store/authStore";

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

// Auth
export const login = (username: string, password: string) =>
  api.post("/auth/login", { username, password }).then((r) => r.data);

// Servers
export const getServers = () => api.get("/servers").then((r) => r.data);
export const createServer = (name: string) =>
  api.post("/servers", { name }).then((r) => r.data);
export const deleteServer = (id: string) => api.delete(`/servers/${id}`);

// Go возвращает null вместо [] для пустых слайсов — нормализуем здесь
const arr = <T>(data: T[] | null): T[] => data ?? [];

// Stats
export const getOverview = (params?: Record<string, string>) =>
  api.get("/stats/overview", { params }).then((r) => r.data);
export const getTopUsers = (params?: Record<string, string>) =>
  api.get("/stats/users", { params }).then((r) => arr(r.data));
export const getUserDetail = (email: string, params?: Record<string, string>) =>
  api.get(`/stats/users/${encodeURIComponent(email)}`, { params }).then((r) => r.data);
export const getTopDestinations = (params?: Record<string, string>) =>
  api.get("/stats/destinations", { params }).then((r) => arr(r.data));
export const getTimeline = (params?: Record<string, string>) =>
  api.get("/stats/timeline", { params }).then((r) => arr(r.data));
export const getInboundStats = (params?: Record<string, string>) =>
  api.get("/stats/inbound", { params }).then((r) => arr(r.data));

// Logs
export const getLogs = (params?: Record<string, string | number>) =>
  api.get("/logs", { params }).then((r) => ({
    ...r.data,
    entries: arr(r.data?.entries),
  }));
