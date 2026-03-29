import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Retry logic for GET requests
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
    
    // Auth errors
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/admin/login';
      return Promise.reject(error);
    }

    if (error.response?.status === 403) {
      const data = error.response.data as any;
      if (data?.code === 'PASSWORD_CHANGE_REQUIRED') {
        window.location.href = '/admin/change-password';
        return Promise.reject(error);
      }
    }

    // Retry logic for GET requests
    if (originalRequest.method?.toLowerCase() === 'get') {
      originalRequest._retryCount = originalRequest._retryCount || 0;
      
      if (originalRequest._retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[originalRequest._retryCount] || 4000;
        originalRequest._retryCount += 1;
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
