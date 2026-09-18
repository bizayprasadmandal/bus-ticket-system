import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole, Trip, Booking, City } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

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
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('auth_token');
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

  sendOTP: (phone_number: string) =>
    api.post('/auth/send-otp', { phone_number }),

  verifyOTP: (data: { phone_number: string; otp: string }) =>
    api.post('/auth/verify-otp', data),

  verifyToken: () => api.get('/auth/verify'),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put('/auth/change-password', data),
};

export const tripAPI = {
  search: (params: {
    origin_city?: string;
    destination_city?: string;
    trip_date?: string;
    passengers?: number;
  }) => api.get('/trips/search', { params }),

  getById: (id: number) => api.get(`/trips/${id}`),

  getSeats: (tripId: number) => api.get(`/trips/${tripId}/seats`),

  getLocation: (tripId: number) => api.get(`/trips/${tripId}/location`),
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

  getMyBookings: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/bookings/my', { params }),

  getById: (id: number) => api.get(`/bookings/${id}`),

  cancel: (id: number, reason?: string) =>
    api.post(`/bookings/${id}/cancel`, { cancellation_reason: reason }),

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

  getDetails: (id: number) => api.get(`/payments/${id}`),
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

export const seatLockAPI = {
  lock: (trip_id: number, seat_numbers: string[]) =>
    api.post('/seat-locks', { trip_id, seat_numbers }),
  release: (id: number) => api.delete(`/seat-locks/${id}`),
};

export const dashboardAPI = {
  getCustomer: () => api.get('/dashboard/customer'),
};

export default api;
