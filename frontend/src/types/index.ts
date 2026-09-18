export interface User {
  id: number;
  phone_number: string;
  email?: string;
  full_name: string;
  full_name_nepali?: string;
  gender?: string;
  status: string;
  is_phone_verified: boolean;
  is_email_verified: boolean;
  roles: UserRole[];
}

export interface UserRole {
  id: number;
  role: 'CUSTOMER' | 'OPERATOR' | 'SUPER_ADMIN';
  operator_id?: number;
  is_active: boolean;
}

export interface Trip {
  id: number;
  trip_date: string;
  departure_time: string;
  arrival_time: string;
  current_fare: number;
  available_seats: number;
  total_seats: number;
  status: string;
  route: Route;
  bus: Bus;
  operator?: Operator;
}

export interface Route {
  id: number;
  route_name?: string;
  origin_city: string;
  destination_city: string;
  distance_km: number;
  estimated_duration: string;
  estimated_duration_minutes?: number;
  base_fare: number;
  stops?: string[];
  is_active?: boolean;
}

export interface Bus {
  id: number;
  bus_number: string;
  bus_model: string;
  bus_type: string;
  total_seats: number;
  seat_layout: any;
  amenities?: string[];
  images?: string[];
  status: string;
  operator_id?: number;
}

export interface Operator {
  id: number;
  company_name: string;
  company_name_nepali?: string;
  logo_url?: string;
  contact_person?: string;
  contact_phone?: string;
  email?: string;
  status: string;
  created_at?: string;
}

export interface Booking {
  id: number;
  pnr: string;
  user_id: number;
  trip_id: number;
  total_passengers: number;
  base_fare: number;
  subtotal: number;
  tax_amount: number;
  service_fee: number;
  discount_amount: number;
  total_amount: number;
  payment_status: string;
  booking_status: string;
  status?: string;
  cancellation_reason?: string;
  refund_amount?: number;
  booking_date: string;
  created_at: string;
  trip?: Trip;
  user?: User;
  passengers?: BookingPassenger[];
}

export interface BookingPassenger {
  id: number;
  booking_id: number;
  passenger_name: string;
  age: number;
  gender: string;
  seat_number: string;
  id_type: string;
  id_number: string;
  phone_number?: string;
}

export interface Payment {
  id: number;
  booking_id: number;
  payment_method: string;
  amount: number;
  currency: string;
  status: string;
  gateway_transaction_id?: string;
  created_at?: string;
  booking?: { pnr: string; total_amount: number; payment_status: string };
}

export interface City {
  id: number;
  name: string;
  name_nepali?: string;
  province?: string;
  is_major_city: boolean;
}

export interface SeatLock {
  id: number;
  trip_id: number;
  user_id: number;
  seat_numbers: string[];
  locked_at: string;
  expires_at: string;
  trip?: Trip;
}

export interface WalletBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: number;
  transaction_type: string;
  amount: number;
  description: string;
  reference_id?: number;
  reference_type?: string;
  created_at: string;
}

export interface TripSeatLayout {
  seat_layout: any;
  total_seats: number;
  available_seats: string[];
  booked_seats: string[];
  locked_seats: string[];
}

export interface DashboardStats {
  total_bookings?: number;
  completed_trips?: number;
  total_spent?: number;
  upcoming_trips_count?: number;
  total_routes?: number;
  total_buses?: number;
  today_trips_count?: number;
  monthly_bookings?: number;
  monthly_revenue?: number;
  total_users?: number;
  total_operators?: number;
  monthly_commission?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  current_page: number;
  total_pages: number;
  total_items: number;
  items_per_page: number;
}

export interface ReportData {
  total_revenue?: number;
  total_bookings?: number;
  average_fare?: number;
  revenue_by_operator?: any[];
  bookings?: any[];
  operators?: any[];
  users?: any[];
  total_users?: number;
}
