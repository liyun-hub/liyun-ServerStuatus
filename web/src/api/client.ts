import type {
  AlertEvent,
  AlertRule,
  MetricsSnapshot,
  NodeSummary,
  AdminLoginResponse,
  AdminNodeItem,
  CreateNodeRequest,
  CreateNodeResponse,
  InstallCommandResponse,
  UpdateNodeDisplayNameRequest,
  ResetNodeTokenResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

const ADMIN_TOKEN_KEY = "admin_token";

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
}

function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? { "Content-Type": "application/json" });
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("未登录");
  }

  const headers = new Headers(init?.headers ?? { "Content-Type": "application/json" });
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  try {
    return await request<T>(path, { ...init, headers });
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("unauthorized") || message.includes("401")) {
      clearAdminToken();
    }
    throw error;
  }
}

export const auth = {
  tokenKey: ADMIN_TOKEN_KEY,
  getToken: getAdminToken,
  setToken: setAdminToken,
  clearToken: clearAdminToken,
  isLoggedIn: () => !!getAdminToken(),
};

export const api = {
  listNodes: () => request<NodeSummary[]>("/api/nodes"),
  getNode: (id: string) => request<NodeSummary>(`/api/nodes/${id}`),
  getNodeHistory: (id: string, from: number, to: number, limit = 1000) =>
    request<MetricsSnapshot[]>(`/api/nodes/${id}/history?from=${from}&to=${to}&limit=${limit}`),

  listAlertRules: () => request<AlertRule[]>("/api/alert-rules"),
  listAlertEvents: () => request<AlertEvent[]>("/api/alert-events"),

  adminLogin: (username: string, password: string) =>
    request<AdminLoginResponse>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  adminLogout: () => adminRequest<{ ok: boolean }>("/api/admin/logout", { method: "POST" }),
  adminListNodes: () => adminRequest<AdminNodeItem[]>("/api/admin/nodes"),
  adminCreateNode: (payload: CreateNodeRequest) =>
    adminRequest<CreateNodeResponse>("/api/admin/nodes", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateNodeDisplayName: (nodeId: string, payload: UpdateNodeDisplayNameRequest) =>
    adminRequest<{ nodeId: string; displayName: string }>(`/api/admin/nodes/${nodeId}/display-name`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  adminResetNodeToken: (nodeId: string) =>
    adminRequest<ResetNodeTokenResponse>(`/api/admin/nodes/${nodeId}/token/reset`, { method: "POST" }),
  adminInstallCommand: (nodeId: string) =>
    adminRequest<InstallCommandResponse>(`/api/admin/nodes/${nodeId}/install-command`, { method: "POST" }),
  adminListAlertRules: () => adminRequest<AlertRule[]>("/api/alert-rules"),
  adminCreateAlertRule: (payload: Omit<AlertRule, "id" | "createdAt" | "updatedAt">) =>
    adminRequest<AlertRule>("/api/alert-rules", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateAlertRule: (id: number, payload: Omit<AlertRule, "id" | "createdAt" | "updatedAt">) =>
    adminRequest<AlertRule>(`/api/alert-rules/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
};

