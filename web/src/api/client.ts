import type { AlertEvent, AlertRule, MetricsSnapshot, NodeSummary } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  listNodes: () => request<NodeSummary[]>("/api/nodes"),
  getNode: (id: string) => request<NodeSummary>(`/api/nodes/${id}`),
  getNodeHistory: (id: string, from: number, to: number, limit = 1000) =>
    request<MetricsSnapshot[]>(`/api/nodes/${id}/history?from=${from}&to=${to}&limit=${limit}`),
  listAlertRules: () => request<AlertRule[]>("/api/alert-rules"),
  createAlertRule: (payload: Omit<AlertRule, "id" | "createdAt" | "updatedAt">) =>
    request<AlertRule>("/api/alert-rules", { method: "POST", body: JSON.stringify(payload) }),
  updateAlertRule: (id: number, payload: Omit<AlertRule, "id" | "createdAt" | "updatedAt">) =>
    request<AlertRule>(`/api/alert-rules/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  listAlertEvents: () => request<AlertEvent[]>("/api/alert-events"),
};
