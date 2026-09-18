import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { authAPI } from '../api';

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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (phoneNumber: string, password: string) => {
    try {
      set({ isLoading: true });
      const response = await authAPI.login({ phone_number: phoneNumber, password });
      const { access_token, user } = response.data;
      await AsyncStorage.setItem('auth_token', access_token);
      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      throw new Error(message);
    }
  },

  register: async (data) => {
    try {
      set({ isLoading: true });
      const response = await authAPI.register(data);
      const { access_token, user } = response.data;
      await AsyncStorage.setItem('auth_token', access_token);
      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      throw new Error(message);
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
      set({ user: response.data.user, token, isAuthenticated: true, isLoading: false });
    } catch {
      await AsyncStorage.removeItem('auth_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
