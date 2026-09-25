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
    const status = error.response?.status;
    const url: string = error.config?.url || '';
    // Failed credential/business checks on auth endpoints are normal form errors —
    // don't wipe the session or reload the page (lets the form display the message).
    const isCredentialFlow =
      url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/change-password');
    if (status === 401 && !isCredentialFlow) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        const next = window.location.pathname + window.location.search;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
      }
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
  verifyToken: () => api.get('/auth/verify'),
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
  getMyTrips: (params?: { trip_date?: string; status?: string }) =>
    api.get('/trips/dispatcher/my-trips', { params }),
  updateStatus: (id: number, status: string) => api.put(`/trips/${id}/status`, { status }),
  assignCrew: (id: number, data: { driver_name?: string; driver_phone?: string; conductor_name?: string; conductor_phone?: string }) =>
    api.put(`/trips/${id}/assign-crew`, data),
  getPassengers: (id: number) => api.get(`/trips/${id}/passengers`),
};

export const driverTripAPI = {
  getMyTrips: () => api.get('/trips/driver/my-trips'),
  updateStatus: (id: number, status: string) => api.put(`/trips/${id}/status`, { status }),
  getSchedule: (params?: { start_date?: string; end_date?: string }) => api.get('/trips/driver/schedule', { params }),
  getPassengers: (id: number) => api.get(`/trips/${id}/passengers`),
  reportLocation: (id: number, data: { latitude: number; longitude: number; speed?: number; heading?: number }) =>
    api.post(`/trips/${id}/location`, data),
};

export const conductorTripAPI = {
  getMyTrips: () => api.get('/trips/conductor/my-trips'),
  getSchedule: (params?: { start_date?: string; end_date?: string }) => api.get('/trips/conductor/schedule', { params }),
};

export const conductorBookingAPI = {
  getMyBookings: (params?: any) => api.get('/bookings/conductor/my-bookings', { params }),
  verifyPNR: (pnr: string) => api.get(`/bookings/verify-pnr/${pnr}`),
  board: (id: number) => api.post(`/bookings/${id}/board`),
  noShow: (id: number) => api.post(`/bookings/${id}/no-show`),
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

export const adminBookingAPI = {
  getAll: (params?: any) => api.get('/admin/bookings', { params }),
};

export const adminPaymentAPI = {
  getAll: (params?: any) => api.get('/admin/payments', { params }),
};

export const adminBusAPI = {
  getAll: (params?: any) => api.get('/admin/buses', { params }),
};

export const adminTripAPI = {
  getAll: (params?: any) => api.get('/admin/trips', { params }),
};

export const adminReviewAPI = {
  getAll: (params?: any) => api.get('/admin/reviews', { params }),
};

export const adminWalletAPI = {
  getAll: (params?: any) => api.get('/admin/wallets', { params }),
  getTransactions: (params?: any) => api.get('/admin/wallets/transactions', { params }),
};

export const adminCityAPI = {
  getAll: (params?: any) => api.get('/cities', { params }),
  create: (data: any) => api.post('/cities', data),
  update: (id: number, data: any) => api.put(`/cities/${id}`, data),
};

export const adminAnalyticsAPI = {
  get: (params?: any) => api.get('/admin/dashboard/analytics', { params }),
};

export const adminRoleAPI = {
  addRole: (userId: number, role: string) => api.put(`/admin/users/${userId}/roles`, { role }),
  removeRole: (userId: number, role: string) => api.delete(`/admin/users/${userId}/roles/${role}`),
};

export const adminNotificationAPI = {
  announce: (data: { title: string; message: string; target: string; priority: string }) =>
    api.post('/admin/notifications/announce', data),
  getAll: (params?: any) => api.get('/admin/notifications', { params }),
};

export const adminPromoAPI = {
  getAll: (params?: any) => api.get('/admin/promo-codes', { params }),
  create: (data: any) => api.post('/admin/promo-codes', data),
  update: (id: number, data: any) => api.put(`/admin/promo-codes/${id}`, data),
  delete: (id: number) => api.delete(`/admin/promo-codes/${id}`),
};

export const adminDisputeAPI = {
  getAll: (params?: any) => api.get('/admin/disputes', { params }),
  create: (data: any) => api.post('/admin/disputes', data),
  update: (id: number, data: any) => api.put(`/admin/disputes/${id}`, data),
};

export const adminRefundAPI = {
  approve: (bookingId: number, data: any) => api.post(`/admin/bookings/${bookingId}/refund`, data),
  reject: (bookingId: number, data: any) => api.post(`/admin/bookings/${bookingId}/refund/reject`, data),
};

export const adminSettingsAPI = {
  get: () => api.get('/admin/settings'),
  update: (data: any) => api.put('/admin/settings', data),
};

export const adminAuditAPI = {
  getAll: (params?: any) => api.get('/admin/audit-log', { params }),
};

export const reviewAPI = {
  create: (data: any) => api.post('/reviews', data),
  getTripReviews: (tripId: number, params?: any) => api.get(`/reviews/trip/${tripId}`, { params }),
  getOperatorReviews: (operatorId: number, params?: any) => api.get(`/reviews/operator/${operatorId}`, { params }),
  getMyReviews: (params?: any) => api.get('/reviews/my-reviews', { params }),
  delete: (id: number) => api.delete(`/reviews/${id}`),
};

export const operatorStaffAPI = {
  getMyStaff: () => api.get('/operators/staff'),
  addStaff: (data: any) => api.post('/operators/staff', data),
  removeStaff: (id: number) => api.delete(`/operators/staff/${id}`),
};

export const fareRuleAPI = {
  getAll: (params?: any) => api.get('/fare-rules', { params }),
  create: (data: any) => api.post('/fare-rules', data),
  update: (id: number, data: any) => api.put(`/fare-rules/${id}`, data),
  delete: (id: number) => api.delete(`/fare-rules/${id}`),
  calculate: (tripId: number) => api.get(`/fare-rules/calculate/${tripId}`),
};

export const operatorProfileAPI = {
  get: () => api.get('/operators/profile'),
  update: (data: any) => api.put('/operators/profile', data),
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: {
    email?: string | null;
    full_name?: string;
    full_name_nepali?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    profile_image_url?: string | null;
  }) => api.put('/users/profile', data),
  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post('/users/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const operatorRevenueAPI = {
  get: (params?: any) => api.get('/dashboard/operator/revenue', { params }),
};

export const operatorNotificationsAPI = {
  get: () => api.get('/dashboard/operator/notifications'),
};
