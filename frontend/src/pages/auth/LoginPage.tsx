import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Bus, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { getHomePath } from '../../utils/homePath';
import { isValidNepalPhone, normalizeNepalPhone } from '../../utils/phone';

export default function LoginPage() {
  const [phone_number, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const phone = normalizeNepalPhone(phone_number);
    if (!isValidNepalPhone(phone)) {
      toast.error('Enter a valid Nepali phone number (e.g. 9841123456)');
      return;
    }
    if (!password) {
      toast.error('Password is required');
      return;
    }

    try {
      await login(phone, password);
      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(
        error.response?.data?.errors?.[0]?.message ||
          error.response?.data?.message ||
          'Login failed'
      );
    }
  };

  // Already signed in (or just signed in) -> leave the auth pages.
  // Deep link: ?next= (set by the API interceptor) > state.from (ProtectedRoute) > role home.
  if (isAuthenticated) {
    const state = location.state as { from?: { pathname?: string; search?: string } } | null;
    const nextParam = new URLSearchParams(location.search).get('next');
    const from = state?.from?.pathname ? state.from.pathname + (state.from.search || '') : null;
    // Opening the site logged-out sends everyone through '/' -> /login, so a bare '/'
    // deep link must not strand staff users on the customer site: role home wins for it.
    // Specific deep links (and ?next=) are still honored.
    const target = from && from !== '/' ? from : nextParam || getHomePath(user);
    return <Navigate to={target} replace />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#d84e55] rounded-full mb-4">
              <Bus className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
              Sign in to your account
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone_number"
                  autoComplete="username"
                  inputMode="tel"
                  value={phone_number}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="9841123456"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] transition-all text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#d84e55] text-white py-2.5 rounded-lg font-semibold hover:bg-[#c4434b] disabled:opacity-50 transition-all text-sm"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#d84e55] font-semibold hover:text-[#c4434b] transition-colors">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
