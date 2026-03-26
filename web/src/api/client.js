const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";
const ADMIN_TOKEN_KEY = "admin_token";
function getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
}
function setAdminToken(token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
}
function clearAdminToken() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
}
async function request(path, init) {
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
    return (text ? JSON.parse(text) : {});
}
async function adminRequest(path, init) {
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
        return await request(path, { ...init, headers });
    }
    catch (error) {
        const message = error.message;
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
    listNodes: () => request("/api/nodes"),
    getNode: (id) => request(`/api/nodes/${id}`),
    getNodeHistory: (id, from, to, limit = 1000) => request(`/api/nodes/${id}/history?from=${from}&to=${to}&limit=${limit}`),
    listAlertRules: () => request("/api/alert-rules"),
    listAlertEvents: () => request("/api/alert-events"),
    adminLogin: (username, password) => request("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
    }),
    adminLogout: () => adminRequest("/api/admin/logout", { method: "POST" }),
    adminListNodes: () => adminRequest("/api/admin/nodes"),
    adminCreateNode: (payload) => adminRequest("/api/admin/nodes", { method: "POST", body: JSON.stringify(payload) }),
    adminUpdateNodeDisplayName: (nodeId, payload) => adminRequest(`/api/admin/nodes/${nodeId}/display-name`, {
        method: "PUT",
        body: JSON.stringify(payload),
    }),
    adminResetNodeToken: (nodeId) => adminRequest(`/api/admin/nodes/${nodeId}/token/reset`, { method: "POST" }),
    adminInstallCommand: (nodeId) => adminRequest(`/api/admin/nodes/${nodeId}/install-command`, { method: "POST" }),
    adminListAlertRules: () => adminRequest("/api/alert-rules"),
    adminCreateAlertRule: (payload) => adminRequest("/api/alert-rules", { method: "POST", body: JSON.stringify(payload) }),
    adminUpdateAlertRule: (id, payload) => adminRequest(`/api/alert-rules/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
};
