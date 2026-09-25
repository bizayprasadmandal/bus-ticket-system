import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { authAPI, setUnauthorizedHandler } from '../api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phoneNumber: string, password: string) => Promise<void>;
  register: (data: {
    phone_number: string;
    password: string;
    full_name: string;
    email?: string;
    gender?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

const apiErrorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.errors?.[0]?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (phoneNumber: string, password: string) => {
    try {
      set({ isLoading: true });
      const response = await authAPI.login({ phone_number: phoneNumber, password });
      const { token, user } = response.data.data;
      await AsyncStorage.setItem('auth_token', token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(apiErrorMessage(error, 'Login failed. Please try again.'));
    }
  },

  register: async (data) => {
    try {
      set({ isLoading: true });
      const response = await authAPI.register(data);
      const { token, user } = response.data.data;
      await AsyncStorage.setItem('auth_token', token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(apiErrorMessage(error, 'Registration failed. Please try again.'));
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      set({ isLoading: true });
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const response = await authAPI.verifyToken();
      const user = response.data.data?.user || response.data.user;
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      // Only a rejected token ends the session — transient network/5xx errors keep it.
      if (error?.response?.status === 401) {
        await AsyncStorage.removeItem('auth_token');
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },
}));

// Any 401 from a non-credential endpoint (see api/index.ts) clears the session,
// which swaps the navigator back to the auth stack.
setUnauthorizedHandler(() => {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
});
