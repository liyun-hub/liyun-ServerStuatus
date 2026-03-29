import { apiClient } from './client';

// Public endpoints
export const checkHealth = () => apiClient.get('/api/health').then(res => res.data);
export const getNodes = () => apiClient.get('/api/nodes').then(res => res.data);
export const getNodeDetails = (id: string) => apiClient.get(`/api/nodes/${id}`).then(res => res.data);
export const getNodeHistory = (id: string, from?: number, to?: number, limit?: number) => {
  const params = new URLSearchParams();
  if (from) params.append('from', from.toString());
  if (to) params.append('to', to.toString());
  if (limit) params.append('limit', limit.toString());
  return apiClient.get(`/api/nodes/${id}/history?${params.toString()}`).then(res => res.data);
};
export const getAlertRules = () => apiClient.get('/api/alert-rules').then(res => res.data);
export const getAlertEvents = (limit?: number) => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  return apiClient.get(`/api/alert-events?${params.toString()}`).then(res => res.data);
};

// Admin endpoints
export const login = (data: any) => apiClient.post('/api/admin/login', data).then(res => res.data);
export const logout = () => apiClient.post('/api/admin/logout').then(res => res.data);
export const changePassword = (data: any) => apiClient.post('/api/admin/change-password', data).then(res => res.data);

// Admin Node Management
export const getAdminNodes = () => apiClient.get('/api/admin/nodes').then(res => res.data);
export const addNode = (data: any) => apiClient.post('/api/admin/nodes', data).then(res => res.data);
export const updateNodeDisplayName = (id: string, displayName: string) => 
  apiClient.put(`/api/admin/nodes/${id}/display-name`, { displayName }).then(res => res.data);
export const resetNodeToken = (id: string) => 
  apiClient.post(`/api/admin/nodes/${id}/token/reset`).then(res => res.data);
export const getNodeInstallCommand = (id: string) => 
  apiClient.post(`/api/admin/nodes/${id}/install-command`).then(res => res.data);

// Admin Alert Rules
export const createAlertRule = (data: any) => apiClient.post('/api/alert-rules', data).then(res => res.data);
export const updateAlertRule = (id: string, data: any) => apiClient.put(`/api/alert-rules/${id}`, data).then(res => res.data);
