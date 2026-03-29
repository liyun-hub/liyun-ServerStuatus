import { create } from 'zustand';

interface AuthState {
  token: string | null;
  mustChangePassword: boolean;
  setAuth: (token: string, mustChangePassword: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('admin_token'),
  mustChangePassword: localStorage.getItem('must_change_password') === 'true',
  setAuth: (token, mustChangePassword) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('must_change_password', String(mustChangePassword));
    set({ token, mustChangePassword });
  },
  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('must_change_password');
    set({ token: null, mustChangePassword: false });
  },
}));
