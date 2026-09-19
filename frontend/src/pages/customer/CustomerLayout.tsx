import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Bus, Home, Ticket, UserCircle, LogOut, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function CustomerLayout() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const navLinks = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/my-bookings', icon: Ticket, label: 'My Bookings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="sticky top-0 z-50 bg-white border-b-2 border-[#d84e55]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <Link to="/" className="flex items-center gap-2">
              <Bus className="h-6 w-6 text-[#d84e55]" />
              <span className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                Samaya Deluxe
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? 'text-[#d84e55]'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-[#d84e55] rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user?.full_name ? getInitials(user.full_name) : 'U'}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
              </button>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-100 z-50 py-1">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{user?.full_name || 'User'}</p>
                      <p className="text-xs text-gray-500">{user?.phone_number}</p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <UserCircle className="h-4 w-4 text-gray-400" />
                      My Profile
                    </Link>
                    <Link
                      to="/my-bookings"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <Ticket className="h-4 w-4 text-gray-400" />
                      My Bookings
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-14">
          <Link
            to="/"
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 ${
              isActive('/') ? 'text-[#d84e55]' : 'text-gray-500'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link
            to="/my-bookings"
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 ${
              isActive('/my-bookings') ? 'text-[#d84e55]' : 'text-gray-500'
            }`}
          >
            <Ticket className="h-5 w-5" />
            <span className="text-[10px] font-medium">Bookings</span>
          </Link>
          <Link
            to="/profile"
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 ${
              isActive('/profile') ? 'text-[#d84e55]' : 'text-gray-500'
            }`}
          >
            <UserCircle className="h-5 w-5" />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
