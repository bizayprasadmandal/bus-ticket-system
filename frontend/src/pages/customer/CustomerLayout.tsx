import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Bus, Home, Ticket, UserCircle, LogOut, ChevronDown, Phone } from 'lucide-react';
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
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top promo bar */}
      <div className="bg-primary-800 text-white text-center py-1.5 text-xs font-medium tracking-wide">
        <Phone className="inline w-3 h-3 mr-1" />
        Need help? Call us at +977-1-4567890 | Book your tickets easily with Samaya Deluxe!
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-primary-600 to-primary-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-white p-1.5 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                <Bus className="h-6 w-6 text-primary-600" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-white tracking-tight">Samaya Deluxe</span>
                <span className="block text-[10px] text-primary-200 -mt-1 font-medium">Bus Ticket Booking</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(link.to)
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              ))}

              {/* Profile dropdown */}
              <div className="relative ml-2">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all"
                >
                  <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm font-medium hidden lg:block max-w-[120px] truncate">{user?.full_name || 'User'}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-2 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <p className="text-sm font-semibold text-gray-800">{user?.full_name || 'User'}</p>
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
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] z-50">
        <div className="flex justify-around items-center h-16">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                isActive(link.to)
                  ? 'text-primary-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <link.icon className={`h-5 w-5 ${isActive(link.to) ? 'text-primary-600' : ''}`} />
              <span className={`text-[10px] font-medium ${isActive(link.to) ? 'text-primary-600' : ''}`}>
                {link.label}
              </span>
              {isActive(link.to) && (
                <div className="w-1 h-1 bg-primary-600 rounded-full -mt-0.5" />
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer - desktop only */}
      <footer className="hidden md:block bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bus className="h-6 w-6 text-primary-500" />
                <span className="text-lg font-bold text-white">Samaya Deluxe</span>
              </div>
              <p className="text-sm leading-relaxed">
                Your trusted partner for bus ticket booking across Nepal. Safe, fast, and reliable.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/my-bookings" className="hover:text-white transition-colors">My Bookings</Link></li>
                <li><Link to="/profile" className="hover:text-white transition-colors">Profile</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Top Routes</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="hover:text-white transition-colors cursor-pointer">Kathmandu → Pokhara</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Kathmandu → Chitwan</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Kathmandu → Biratnagar</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>+977-1-4567890</li>
                <li>support@samayadeluxe.com</li>
                <li>Kathmandu, Nepal</li>
              </ul>
            </div>
          </div>
          <hr className="border-gray-800 my-6" />
          <p className="text-center text-xs text-gray-500">
            &copy; 2026 Samaya Deluxe. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
