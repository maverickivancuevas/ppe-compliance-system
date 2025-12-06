import { create } from 'zustand';
import { User } from '@/types';
import { authAPI } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { access_token } = await authAPI.login(email, password);

      // Store token
      localStorage.setItem('token', access_token);

      // Fetch user data
      const user = await authAPI.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(user));

      set({ token: access_token, user, isLoading: false });
    } catch (error: any) {
      let message = 'Login failed';

      // Check for specific error types
      if (error.response?.status === 401) {
        message = 'Incorrect email or password. Please try again.';
      } else if (error.response?.data?.detail) {
        message = error.response.data.detail;
      }

      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token) {
      set({ user: null, token: null });
      return;
    }

    try {
      // Try to fetch current user
      const user = await authAPI.getCurrentUser();
      set({ user, token });
    } catch (error) {
      // Token is invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null });
    }
  },

  clearError: () => set({ error: null }),
}));
