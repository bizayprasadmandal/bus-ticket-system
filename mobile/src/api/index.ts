import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Session teardown on 401 — registered by the auth store (avoids a circular import).
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url || '';
    // Failed credential/business checks on auth endpoints are normal form errors —
    // don't tear down the session (lets the form show the message).
    const isCredentialFlow =
      url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/change-password');
    if (status === 401 && !isCredentialFlow) {
      AsyncStorage.removeItem('auth_token');
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data: { phone_number: string; password: string }) =>
    api.post('/auth/login', data),

  register: (data: {
    phone_number: string;
    password: string;
    full_name: string;
    email?: string;
    gender?: string;
  }) => api.post('/auth/register', data),

  verifyToken: () => api.get('/auth/verify'),
};

export const tripAPI = {
  search: (params: {
    origin_city?: string;
    destination_city?: string;
    trip_date?: string;
    passengers?: number;
  }) => api.get('/trips/search', { params }),

  getSeats: (tripId: number) => api.get(`/trips/${tripId}/seats`),
};

export const bookingAPI = {
  create: (data: {
    trip_id: number;
    passengers: {
      passenger_name: string;
      age: number;
      gender: string;
      seat_number: string;
      id_type: string;
      id_number: string;
      phone_number?: string;
    }[];
  }) => api.post('/bookings', data),

  getMyBookings: (params?: { page?: number; limit?: number }) =>
    api.get('/bookings', { params }),

  getById: (id: number) => api.get(`/bookings/${id}`),

  cancel: (id: number, reason?: string) =>
    api.post(`/bookings/${id}/cancel`, { reason, cancellation_reason: reason }),

  getByPNR: (pnr: string) => api.get(`/bookings/pnr/${pnr}`),
};

export const paymentAPI = {
  initiate: (data: {
    booking_id: number;
    payment_method: string;
    amount: number;
  }) => api.post('/payments', data),

  verify: (paymentId: number, params?: any) =>
    api.post(`/payments/${paymentId}/verify`, null, { params }),
};

export const cityAPI = {
  getAll: (params?: { major_only?: boolean }) =>
    api.get('/cities', { params }),
};

export const walletAPI = {
  getBalance: () => api.get('/wallets/balance'),

  topUp: (amount: number, payment_method?: string) =>
    api.post('/wallets/topup', { amount, payment_method }),

  getTransactions: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get('/wallets/transactions', { params }),
};

export default api;
