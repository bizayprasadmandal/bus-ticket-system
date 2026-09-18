import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Bus, Home, Ticket, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function CustomerLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2">
              <Bus className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-800">Samaya Deluxe</span>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition"
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </Link>
              <Link
                to="/my-bookings"
                className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition"
              >
                <Ticket className="h-5 w-5" />
                <span>My Bookings</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-gray-600 hover:text-red-600 transition"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
