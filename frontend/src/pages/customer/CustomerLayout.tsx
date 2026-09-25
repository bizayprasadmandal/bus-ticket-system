import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Bus, Home, Ticket, UserCircle, LogOut, ChevronDown, Phone, Mail, MapPin, Wallet, Star, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import LanguageToggle from '../../components/LanguageToggle';
import Avatar from '../../components/Avatar';
import { PLATFORM_NAME, PLATFORM_EMAIL } from '../../constants/brand';
import { getHomePath } from '../../utils/homePath';

const PANEL_LABELS: Record<string, string> = {
  '/admin': 'Admin Panel',
  '/operator': 'Operator Panel',
  '/dispatcher': 'Dispatcher Panel',
  '/driver': 'Driver Panel',
  '/conductor': 'Conductor Panel',
  '/counter': 'Counter Panel',
};

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

  // Staff users landing here (search/book as a customer) need a way back to their panel.
  const roleHome = getHomePath(user);
  const panelLabel = PANEL_LABELS[roleHome];

  const navLinks = [
    ...(panelLabel ? [{ to: roleHome, icon: LayoutDashboard, label: panelLabel }] : []),
    { to: '/', icon: Home, label: 'Home' },
    { to: '/my-bookings', icon: Ticket, label: 'My Bookings' },
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/reviews', icon: Star, label: 'Reviews' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const mobileTabs = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/my-bookings', icon: Ticket, label: 'Bookings' },
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/reviews', icon: Star, label: 'Reviews' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 shadow-[0_1px_0_rgba(216,78,85,0.18),0_6px_24px_-16px_rgba(16,24,40,0.18)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="group flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#d84e55] to-[#b53d43] shadow-[0_6px_14px_-6px_rgba(216,78,85,0.7)] transition-transform group-hover:scale-105">
                <Bus className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                {PLATFORM_NAME}
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all ${
                    isActive(link.to)
                      ? 'bg-[#fef2f2] text-[#b53d43] shadow-[inset_0_0_0_1px_rgba(216,78,85,0.25)]'
                      : 'text-gray-600 hover:text-[#d84e55] hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <LanguageToggle />
              <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-1.5 rounded-full p-0.5 transition hover:bg-gray-100"
              >
                <Avatar
                  src={user?.profile_image_url}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                  fallback={
                    <div className="w-9 h-9 bg-gradient-to-br from-[#d84e55] to-[#b53d43] rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {user?.full_name ? getInitials(user.full_name) : 'U'}
                    </div>
                  }
                />
                <ChevronDown className={`h-4 w-4 text-gray-400 hidden sm:block transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl ring-1 ring-black/5 border border-gray-100 z-50 py-1.5 overflow-hidden animate-fade-in-down">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-b from-[#fef7f7] to-white">
                      <p className="text-sm font-semibold text-gray-900">{user?.full_name || 'User'}</p>
                      <p className="text-xs text-gray-500">{user?.phone_number}</p>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <UserCircle className="h-4 w-4 text-gray-400" />
                      My Profile
                    </Link>
                    {panelLabel && (
                      <Link
                        to={roleHome}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-[#b53d43] rounded-xl bg-[#fef2f2] hover:bg-[#fee2e2] transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        {panelLabel}
                      </Link>
                    )}
                    <Link
                      to="/my-bookings"
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <Ticket className="h-4 w-4 text-gray-400" />
                      My Bookings
                    </Link>
                    </div>
                    <hr className="my-1 border-gray-100" />
                    <div className="p-1.5">
                    <button
                      onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6 animate-fade-in">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-50 shadow-[0_-8px_24px_-16px_rgba(16,24,40,0.25)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          {mobileTabs.map((tab) => {
            const active = isActive(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center gap-1 px-3 py-1 transition-colors"
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition-all ${
                    active
                      ? 'bg-gradient-to-br from-[#d84e55] to-[#b53d43] text-white shadow-[0_6px_14px_-6px_rgba(216,78,85,0.8)]'
                      : 'text-gray-500'
                  }`}
                >
                  <tab.icon className="h-[18px] w-[18px]" />
                </span>
                <span className={`text-[10px] font-semibold ${active ? 'text-[#b53d43]' : 'text-gray-500'}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 hidden md:block relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d84e55] to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#d84e55] to-[#b53d43]">
                  <Bus className="h-4.5 w-4.5 text-white" />
                </span>
                <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>{PLATFORM_NAME}</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Your trusted partner for comfortable and safe bus travel across Nepal.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-[0.16em]">Quick Links</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/my-bookings" className="text-gray-400 hover:text-white transition-colors">My Bookings</Link></li>
                <li><Link to="/profile" className="text-gray-400 hover:text-white transition-colors">My Profile</Link></li>
              </ul>
            </div>

            {/* Top Routes */}
            <div>
              <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-[0.16em]">Top Routes</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/search?from=Kathmandu&to=Pokhara" className="text-gray-400 hover:text-white transition-colors">Kathmandu → Pokhara</Link></li>
                <li><Link to="/search?from=Kathmandu&to=Chitwan" className="text-gray-400 hover:text-white transition-colors">Kathmandu → Chitwan</Link></li>
                <li><Link to="/search?from=Pokhara&to=Kathmandu" className="text-gray-400 hover:text-white transition-colors">Pokhara → Kathmandu</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-[0.16em]">Contact Us</h3>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-[#f27278]" /> 01-4XXXXXX</li>
                <li className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-[#f27278]" /> {PLATFORM_EMAIL}</li>
                <li className="flex items-center gap-2.5"><MapPin className="h-4 w-4 text-[#f27278]" /> Kathmandu, Nepal</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 flex items-center justify-between text-sm text-gray-500">
            <span>&copy; {new Date().getFullYear()} {PLATFORM_NAME}. All rights reserved.</span>
            <span className="text-gray-600 text-xs">Kathmandu, Nepal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
