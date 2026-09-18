import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CustomerLayout from './pages/customer/CustomerLayout';
import SearchPage from './pages/customer/SearchPage';
import BookingPage from './pages/customer/BookingPage';
import MyBookingsPage from './pages/customer/MyBookingsPage';
import OperatorLayout from './pages/operator/OperatorLayout';
import OperatorDashboard from './pages/operator/OperatorDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';

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
          <Route path="my-bookings" element={<MyBookingsPage />} />
        </Route>

        <Route path="/operator" element={
          <ProtectedRoute allowedRoles={['OPERATOR']}>
            <OperatorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<OperatorDashboard />} />
        </Route>

        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
