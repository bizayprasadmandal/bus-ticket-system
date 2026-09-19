import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CustomerLayout from './pages/customer/CustomerLayout';
import SearchPage from './pages/customer/SearchPage';
import BookingPage from './pages/customer/BookingPage';
import MyBookingsPage from './pages/customer/MyBookingsPage';
import PaymentPage from './pages/customer/PaymentPage';
import PaymentCallbackPage from './pages/customer/PaymentCallbackPage';
import ProfilePage from './pages/customer/ProfilePage';
import OperatorLayout from './pages/operator/OperatorLayout';
import OperatorDashboard from './pages/operator/OperatorDashboard';
import OperatorBusesPage from './pages/operator/OperatorBusesPage';
import OperatorRoutesPage from './pages/operator/OperatorRoutesPage';
import OperatorTripsPage from './pages/operator/OperatorTripsPage';
import OperatorBookingsPage from './pages/operator/OperatorBookingsPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOperatorsPage from './pages/admin/AdminOperatorsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import ApiDocsPage from './pages/admin/ApiDocsPage';
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
            <Route path="profile" element={<ProfilePage />} />
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
          </Route>

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="operators" element={<AdminOperatorsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="api-docs" element={<ApiDocsPage />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
