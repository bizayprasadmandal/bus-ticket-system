import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole, Trip, Booking, City } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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

export const authAPI = {
  login: (data: { phone_number: string; password: string }) =>
    api.post<{ access_token: string; user: User }>('/auth/login', data),

  register: (data: {
    phone_number: string;
    password: string;
    full_name: string;
    email?: string;
    gender?: string;
  }) => api.post<{ access_token: string; user: User }>('/auth/register', data),

  sendOTP: (phone_number: string) =>
    api.post<{ message: string }>('/auth/send-otp', { phone_number }),

  verifyOTP: (data: { phone_number: string; otp: string }) =>
    api.post<{ message: string }>('/auth/verify-otp', data),

  verifyToken: () => api.get<{ user: User }>('/auth/me'),
};

export const tripAPI = {
  search: (params: {
    origin_city?: string;
    destination_city?: string;
    trip_date?: string;
    passengers?: number;
  }) => api.get<{ trips: Trip[] }>('/trips/search', { params }),

  getById: (id: number) => api.get<{ trip: Trip }>(`/trips/${id}`),

  getSeats: (tripId: number) =>
    api.get<{ available_seats: string[]; seat_layout: any }>(`/trips/${tripId}/seats`),
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
  }) => api.post<{ booking: Booking }>('/bookings', data),

  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ bookings: Booking[]; total: number }>('/bookings', { params }),

  getById: (id: number) => api.get<{ booking: Booking }>(`/bookings/${id}`),

  cancel: (id: number, reason?: string) =>
    api.post<{ booking: Booking }>(`/bookings/${id}/cancel`, { cancellation_reason: reason }),

  getByPNR: (pnr: string) => api.get<{ booking: Booking }>(`/bookings/pnr/${pnr}`),
};

export const paymentAPI = {
  initiate: (data: {
    booking_id: number;
    payment_method: string;
    amount: number;
  }) => api.post<{ payment_id: string; payment_url?: string }>('/payments/initiate', data),

  verify: (data: { payment_id: string; transaction_id: string }) =>
    api.post<{ status: string }>('/payments/verify', data),
};

export const cityAPI = {
  getAll: () => api.get<{ cities: City[] }>('/cities'),
};

export const walletAPI = {
  getBalance: () => api.get<{ balance: number }>('/wallet/balance'),

  topUp: (data: { amount: number; payment_method: string }) =>
    api.post<{ transaction_id: string }>('/wallet/topup', data),

  getTransactions: (params?: { page?: number; limit?: number }) =>
    api.get<{ transactions: any[]; total: number }>('/wallet/transactions', { params }),
};

export default api;
