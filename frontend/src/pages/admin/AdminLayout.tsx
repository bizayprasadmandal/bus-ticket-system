import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserCog, BarChart3, LogOut, Menu, X, Code, ChevronRight, ExternalLink, CreditCard, Bus, Map, Star, Wallet, MapPin, RotateCcw, AlertTriangle, Bell, Settings, FileText, Tag, TrendingUp, UserCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/operators', label: 'Operators', icon: UserCog },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/bookings', label: 'Bookings', icon: CreditCard },
  { to: '/admin/trips', label: 'Trips', icon: Map },
  { to: '/admin/buses', label: 'Buses', icon: Bus },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/refunds', label: 'Refunds', icon: RotateCcw },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
  { to: '/admin/wallets', label: 'Wallets', icon: Wallet },
  { to: '/admin/promo-codes', label: 'Promo Codes', icon: Tag },
  { to: '/admin/cities', label: 'Cities', icon: MapPin },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/audit-log', label: 'Audit Log', icon: FileText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/api-docs', label: 'API Docs', icon: Code },
  { to: '/admin/profile', label: 'Profile', icon: UserCircle },
];

export default function AdminLayout() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const isActive = (item: typeof navItems[0]) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Admin', path: '/admin' }];

    if (segments.length > 1) {
      const page = segments[1];
      const pageLabels: Record<string, string> = {
        operators: 'Operators',
        users: 'Users',
        reports: 'Reports',
        'api-docs': 'API Documentation',
        bookings: 'Bookings',
        trips: 'Trips',
        buses: 'Buses',
        reviews: 'Reviews',
        cities: 'Cities',
        wallets: 'Wallets',
        analytics: 'Analytics',
        refunds: 'Refund Management',
        disputes: 'Dispute Resolution',
        notifications: 'Notifications',
        'audit-log': 'Audit Log',
        settings: 'System Settings',
        'promo-codes': 'Promo Codes',
        profile: 'My Profile',
      };
      if (pageLabels[page]) {
        breadcrumbs.push({ label: pageLabels[page], path: path });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const getUserInitials = () => {
    if (!user?.full_name) return 'A';
    return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 sidebar-gradient shadow-sm border-r flex flex-col transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center logo-glow">
              <span className="text-white font-bold text-sm">AD</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-800">Admin Panel</h1>
              <p className="text-xs text-gray-400">Gadi Ticket</p>
            </div>
          </div>
          <button
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium sidebar-nav-item ${
                isActive(item) ? 'active' : ''
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3 px-3 py-2">
            <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
              {user?.profile_image_url ? (
                <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-600 font-semibold text-sm">{getUserInitials()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.full_name || 'Admin'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email || 'Super Admin'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden h-16 bg-white border-b flex items-center px-4">
          <button
            className="p-2 text-gray-600 hover:text-gray-800"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="ml-3 text-lg font-bold text-blue-600">Admin Panel</h1>
        </div>

        {/* Top bar with breadcrumbs */}
        <div className="hidden lg:flex h-14 bg-white border-b items-center justify-between px-6">
          <nav className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.path} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="h-4 w-4 text-gray-300" />}
                <span className={index === breadcrumbs.length - 1 ? 'text-gray-800 font-medium' : 'text-gray-400'}>
                  {crumb.label}
                </span>
              </div>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              <ExternalLink className="h-4 w-4" />
              View Site
            </Link>
          </div>
        </div>

        <main className="flex-1 p-6 lg:p-8 overflow-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}