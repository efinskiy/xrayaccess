export interface LoginResponse {
  token: string;
  expires_at: string;
  username: string;
}

export interface Server {
  id: string;
  name: string;
  ip_address: string;
  last_seen_at: string | null;
  created_at: string;
}

export interface ServerCreated extends Server {
  api_key: string;
}

export interface OverviewStats {
  total_requests: number;
  unique_users: number;
  unique_dests: number;
  active_servers: number;
  from: string;
  to: string;
}

export interface UserStat {
  user_email: string;
  requests: number;
  unique_dests: number;
}

export interface DestStat {
  dest_host: string;
  requests: number;
  unique_users: number;
}

export interface TimelineBucket {
  time: string;
  requests: number;
}

export interface UserDetail {
  user_email: string;
  requests: number;
  unique_dests: number;
  first_seen: string | null;
  last_seen: string | null;
}

export interface InboundStat {
  inbound: string;
  requests: number;
}

export interface LogEntry {
  id: number;
  server_id: string;
  timestamp: string;
  source_ip: string;
  source_port: number;
  source_protocol: string;
  dest_protocol: string;
  dest_host: string;
  dest_port: number;
  inbound: string;
  outbound: string;
  user_email: string;
}

export interface LogsResponse {
  entries: LogEntry[];
  total: number;
  page: number;
  page_size: number;
}

export interface TimeRangeParams {
  from?: string;
  to?: string;
}
