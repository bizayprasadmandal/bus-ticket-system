import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { LanguageProvider } from './i18n/LanguageContext';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CustomerLayout from './pages/customer/CustomerLayout';
import SearchPage from './pages/customer/SearchPage';
import BookingPage from './pages/customer/BookingPage';
import MyBookingsPage from './pages/customer/MyBookingsPage';
import PaymentPage from './pages/customer/PaymentPage';
import PaymentCallbackPage from './pages/customer/PaymentCallbackPage';
import ProfilePage from './pages/customer/ProfilePage';
import ReviewsPage from './pages/customer/ReviewsPage';
import WalletPage from './pages/customer/WalletPage';
import TripTrackingPage from './pages/customer/TripTrackingPage';
import OperatorLayout from './pages/operator/OperatorLayout';
import OperatorDashboard from './pages/operator/OperatorDashboard';
import OperatorBusesPage from './pages/operator/OperatorBusesPage';
import OperatorRoutesPage from './pages/operator/OperatorRoutesPage';
import OperatorTripsPage from './pages/operator/OperatorTripsPage';
import OperatorBookingsPage from './pages/operator/OperatorBookingsPage';
import OperatorStaffPage from './pages/operator/OperatorStaffPage';
import OperatorFareRulesPage from './pages/operator/OperatorFareRulesPage';
import OperatorProfilePage from './pages/operator/OperatorProfilePage';
import OperatorRevenuePage from './pages/operator/OperatorRevenuePage';
import OperatorSchedulePage from './pages/operator/OperatorSchedulePage';
import OperatorNotificationsPage from './pages/operator/OperatorNotificationsPage';
import OperatorReportsPage from './pages/operator/OperatorReportsPage';
import OperatorReviewsPage from './pages/operator/OperatorReviewsPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOperatorsPage from './pages/admin/AdminOperatorsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminTripsPage from './pages/admin/AdminTripsPage';
import AdminBusesPage from './pages/admin/AdminBusesPage';
import AdminReviewsPage from './pages/admin/AdminReviewsPage';
import AdminCitiesPage from './pages/admin/AdminCitiesPage';
import AdminWalletsPage from './pages/admin/AdminWalletsPage';
import ApiDocsPage from './pages/admin/ApiDocsPage';
import DispatcherLayout from './pages/dispatcher/DispatcherLayout';
import DispatcherDashboard from './pages/dispatcher/DispatcherDashboard';
import DispatcherTripsPage from './pages/dispatcher/DispatcherTripsPage';
import DispatcherBusesPage from './pages/dispatcher/DispatcherBusesPage';
import DriverLayout from './pages/driver/DriverLayout';
import DriverDashboard from './pages/driver/DriverDashboard';
import DriverTripsPage from './pages/driver/DriverTripsPage';
import ConductorLayout from './pages/conductor/ConductorLayout';
import ConductorDashboard from './pages/conductor/ConductorDashboard';
import ConductorTripsPage from './pages/conductor/ConductorTripsPage';
import ConductorPassengersPage from './pages/conductor/ConductorPassengersPage';
import CounterAgentLayout from './pages/counter/CounterAgentLayout';
import CounterAgentDashboard from './pages/counter/CounterAgentDashboard';
import CounterAgentBookPage from './pages/counter/CounterAgentBookPage';
import CounterAgentBookingsPage from './pages/counter/CounterAgentBookingsPage';
import ErrorBoundary from './components/ErrorBoundary';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user) {
    const userRoles = user.roles?.map(r => r.role) || [];
    const hasAccess = allowedRoles.some(role => userRoles.includes(role as any));
    if (!hasAccess) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
      <Toaster position="top-right" />
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/" element={
            <ProtectedRoute>
              <CustomerLayout />
            </ProtectedRoute>
          }>
            <Route index element={<SearchPage />} />
            <Route path="book/:tripId" element={<BookingPage />} />
            <Route path="payment/:bookingId" element={<PaymentPage />} />
            <Route path="payment/callback/:paymentId" element={<PaymentCallbackPage />} />
            <Route path="my-bookings" element={<MyBookingsPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="tracking/:tripId" element={<TripTrackingPage />} />
          </Route>

          <Route path="/operator" element={
            <ProtectedRoute allowedRoles={['OPERATOR']}>
              <OperatorLayout />
            </ProtectedRoute>
          }>
            <Route index element={<OperatorDashboard />} />
            <Route path="buses" element={<OperatorBusesPage />} />
            <Route path="routes" element={<OperatorRoutesPage />} />
            <Route path="trips" element={<OperatorTripsPage />} />
            <Route path="bookings" element={<OperatorBookingsPage />} />
            <Route path="schedule" element={<OperatorSchedulePage />} />
            <Route path="revenue" element={<OperatorRevenuePage />} />
            <Route path="reports" element={<OperatorReportsPage />} />
            <Route path="reviews" element={<OperatorReviewsPage />} />
            <Route path="staff" element={<OperatorStaffPage />} />
            <Route path="fare-rules" element={<OperatorFareRulesPage />} />
            <Route path="notifications" element={<OperatorNotificationsPage />} />
            <Route path="profile" element={<OperatorProfilePage />} />
          </Route>

          <Route path="/dispatcher" element={
            <ProtectedRoute allowedRoles={['DISPATCHER', 'OPERATOR']}>
              <DispatcherLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DispatcherDashboard />} />
            <Route path="trips" element={<DispatcherTripsPage />} />
            <Route path="buses" element={<DispatcherBusesPage />} />
          </Route>

          <Route path="/driver" element={
            <ProtectedRoute allowedRoles={['DRIVER', 'OPERATOR']}>
              <DriverLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DriverDashboard />} />
            <Route path="trips" element={<DriverTripsPage />} />
          </Route>

          <Route path="/conductor" element={
            <ProtectedRoute allowedRoles={['CONDUCTOR', 'OPERATOR']}>
              <ConductorLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ConductorDashboard />} />
            <Route path="trips" element={<ConductorTripsPage />} />
            <Route path="passengers" element={<ConductorPassengersPage />} />
          </Route>

          <Route path="/counter" element={
            <ProtectedRoute allowedRoles={['COUNTER_AGENT', 'OPERATOR']}>
              <CounterAgentLayout />
            </ProtectedRoute>
          }>
            <Route index element={<CounterAgentDashboard />} />
            <Route path="book" element={<CounterAgentBookPage />} />
            <Route path="bookings" element={<CounterAgentBookingsPage />} />
          </Route>

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="operators" element={<AdminOperatorsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="bookings" element={<AdminBookingsPage />} />
            <Route path="trips" element={<AdminTripsPage />} />
            <Route path="buses" element={<AdminBusesPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="cities" element={<AdminCitiesPage />} />
            <Route path="wallets" element={<AdminWalletsPage />} />
            <Route path="api-docs" element={<ApiDocsPage />} />
          </Route>
        </Routes>
      </ErrorBoundary>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
