import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  register: (data: { phone_number: string; full_name: string; password: string; email?: string; gender?: string }) =>
    api.post('/auth/register', data),
  login: (data: { phone_number: string; password: string }) =>
    api.post('/auth/login', data),
  sendOTP: (phone_number: string) =>
    api.post('/auth/send-otp', { phone_number }),
  verifyOTP: (phone_number: string, otp: string) =>
    api.post('/auth/verify-otp', { phone_number, otp }),
  verifyToken: () => api.get('/auth/verify'),
  refreshToken: () => api.post('/auth/refresh'),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put('/auth/change-password', data),
};

export const tripAPI = {
  search: (params: { origin_city: string; destination_city: string; trip_date: string; passengers?: number }) =>
    api.get('/trips/search', { params }),
  getById: (id: number) => api.get(`/trips/${id}`),
  getSeats: (id: number) => api.get(`/trips/${id}/seats`),
  getLocation: (id: number) => api.get(`/trips/${id}/location`),
};

export const bookingAPI = {
  create: (data: { trip_id: number; passengers: any[] }) =>
    api.post('/bookings', data),
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/bookings', { params }),
  getById: (id: number) => api.get(`/bookings/${id}`),
  cancel: (id: number, reason?: string) =>
    api.post(`/bookings/${id}/cancel`, { cancellation_reason: reason }),
  getByPNR: (pnr: string) => api.get(`/bookings/pnr/${pnr}`),
};

export const paymentAPI = {
  initiate: (data: { booking_id: number; payment_method: string; amount: number }) =>
    api.post('/payments', data),
  verify: (id: number, params?: any) =>
    api.post(`/payments/${id}/verify`, null, { params }),
  getDetails: (id: number) => api.get(`/payments/${id}`),
  getHistory: (params?: { page?: number; limit?: number }) =>
    api.get('/payments', { params }),
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
  getActive: () => api.get('/seat-locks/active'),
  extend: (id: number) => api.put(`/seat-locks/${id}/extend`),
};

export const dashboardAPI = {
  getCustomer: () => api.get('/dashboard/customer'),
  getOperator: () => api.get('/dashboard/operator'),
  getAdmin: () => api.get('/dashboard/admin'),
  getDispatcher: () => api.get('/dashboard/dispatcher'),
  getDriver: () => api.get('/dashboard/driver'),
  getConductor: () => api.get('/dashboard/conductor'),
  getCounterAgent: () => api.get('/dashboard/counter-agent'),
};

export const dispatcherTripAPI = {
  getMyTrips: () => api.get('/trips/dispatcher/my-trips'),
};

export const driverTripAPI = {
  getMyTrips: () => api.get('/trips/driver/my-trips'),
  updateStatus: (id: number, status: string) => api.put(`/trips/${id}/status`, { status }),
};

export const conductorTripAPI = {
  getMyTrips: () => api.get('/trips/conductor/my-trips'),
};

export const conductorBookingAPI = {
  getMyBookings: (params?: any) => api.get('/bookings/conductor/my-bookings', { params }),
};

export const counterAgentBookingAPI = {
  getMyBookings: (params?: any) => api.get('/bookings/counter-agent/my-bookings', { params }),
};

export const reportAPI = {
  getBookings: (params?: any) => api.get('/reports/bookings', { params }),
  getRevenue: (params?: any) => api.get('/reports/revenue', { params }),
  getOperators: (params?: any) => api.get('/reports/operators', { params }),
  getUsers: (params?: any) => api.get('/reports/users', { params }),
};

export const operatorBusAPI = {
  getMyBuses: () => api.get('/buses/operator/my-buses'),
  getAll: (params?: any) => api.get('/buses', { params }),
  getById: (id: number) => api.get(`/buses/${id}`),
  create: (data: any) => api.post('/buses', data),
  update: (id: number, data: any) => api.put(`/buses/${id}`, data),
  delete: (id: number) => api.delete(`/buses/${id}`),
};

export const operatorRouteAPI = {
  getMyRoutes: () => api.get('/routes/operator/my-routes'),
  getAll: (params?: any) => api.get('/routes', { params }),
  getById: (id: number) => api.get(`/routes/${id}`),
  create: (data: any) => api.post('/routes', data),
  update: (id: number, data: any) => api.put(`/routes/${id}`, data),
  delete: (id: number) => api.delete(`/routes/${id}`),
};

export const operatorTripAPI = {
  getMyTrips: (params?: any) => api.get('/trips/operator/my-trips', { params }),
  getById: (id: number) => api.get(`/trips/${id}`),
  create: (data: any) => api.post('/trips', data),
  update: (id: number, data: any) => api.put(`/trips/${id}`, data),
  updateStatus: (id: number, status: string) => api.put(`/trips/${id}/status`, { status }),
  delete: (id: number) => api.delete(`/trips/${id}`),
};

export const operatorBookingAPI = {
  getMyBookings: (params?: any) => api.get('/bookings/operator/my-bookings', { params }),
};

export const adminOperatorAPI = {
  getAll: (params?: any) => api.get('/admin/operators', { params }),
  getById: (id: number) => api.get(`/admin/operators/${id}`),
  create: (data: any) => api.post('/admin/operators', data),
  update: (id: number, data: any) => api.put(`/admin/operators/${id}`, data),
};

export const adminUserAPI = {
  getAll: (params?: any) => api.get('/admin/users', { params }),
  getById: (id: number) => api.get(`/admin/users/${id}`),
  updateStatus: (id: number, is_active: boolean) => api.put(`/admin/users/${id}/status`, { is_active }),
};
