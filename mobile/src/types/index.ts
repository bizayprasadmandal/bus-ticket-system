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
  status: string;
  route: Route;
  bus: Bus;
  operator?: Operator;
}

export interface Route {
  id: number;
  route_name: string;
  origin_city: string;
  destination_city: string;
  distance_km: number;
  estimated_duration_minutes: number;
  base_fare: number;
  stops?: string[];
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
}

export interface Operator {
  id: number;
  company_name: string;
  company_name_nepali?: string;
  logo_url?: string;
  status: string;
}

export interface Booking {
  id: number;
  pnr: string;
  user_id: number;
  trip_id: number;
  total_passengers: number;
  base_amount: number;
  tax_amount: number;
  service_fee: number;
  total_amount: number;
  payment_status: string;
  booking_status: string;
  cancellation_reason?: string;
  refund_amount?: number;
  refund_percentage?: number;
  booking_date: string;
  trip?: Trip;
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

export interface City {
  id: number;
  name: string;
  name_nepali?: string;
  province?: string;
  is_major_city: boolean;
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
