const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";
async function request(path, init) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
    }
    return response.json();
}
export const api = {
    listNodes: () => request("/api/nodes"),
    getNode: (id) => request(`/api/nodes/${id}`),
    getNodeHistory: (id, from, to, limit = 1000) => request(`/api/nodes/${id}/history?from=${from}&to=${to}&limit=${limit}`),
    listAlertRules: () => request("/api/alert-rules"),
    createAlertRule: (payload) => request("/api/alert-rules", { method: "POST", body: JSON.stringify(payload) }),
    updateAlertRule: (id, payload) => request(`/api/alert-rules/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    listAlertEvents: () => request("/api/alert-events"),
};
