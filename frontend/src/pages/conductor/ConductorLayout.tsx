import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, ScanSearch, Clock, LogOut, Menu, X, ChevronRight, ExternalLink, UserCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCompanyBrand } from '../../hooks/useCompanyBrand';
import Avatar from '../../components/Avatar';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/conductor', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/conductor/trips', label: 'My Trips', icon: Calendar },
  { to: '/conductor/passengers', label: 'Passengers', icon: Users },
  { to: '/conductor/verify', label: 'Verify Ticket', icon: ScanSearch },
  { to: '/conductor/schedule', label: 'Schedule', icon: Clock },
  { to: '/conductor/profile', label: 'Profile', icon: UserCircle },
];

export default function ConductorLayout() {
  const { user, logout } = useAuthStore();
  const companyName = useCompanyBrand();
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
    const segments = location.pathname.split('/').filter(Boolean);
    const crumbs = [{ label: 'Home', path: '/conductor' }];
    const segmentLabels: Record<string, string> = { 'seat-map': 'Seat Map' };
    let currentPath = '';
    segments.forEach((seg, i) => {
      if (i === 0) return;
      if (/^\d+$/.test(seg)) {
        const last = crumbs[crumbs.length - 1];
        if (last && last.label !== 'Home') {
          crumbs[crumbs.length - 1] = { label: `${last.label} #${seg}`, path: last.path };
        }
        return;
      }
      currentPath += `/${seg}`;
      const full = `/conductor${currentPath}`;
      const item = navItems.find(n => n.to === full);
      crumbs.push({ label: segmentLabels[seg] || item?.label || seg.charAt(0).toUpperCase() + seg.slice(1), path: full });
    });
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const currentPageLabel = navItems.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))?.label
    || (location.pathname.startsWith('/conductor/seat-map') ? 'Seat Map' : 'Dashboard');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 sidebar-gradient shadow-sm border-r flex flex-col transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center logo-glow">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-800">{companyName}</h1>
              <p className="text-xs text-gray-500">Conductor Panel</p>
            </div>
          </div>
          <button className="lg:hidden p-1 text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium sidebar-nav-item ${
                isActive(item) ? 'sidebar-nav-item active text-primary-700' : 'sidebar-nav-item text-gray-600'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
              <Avatar
                src={user?.profile_image_url}
                className="w-full h-full object-cover"
                fallback={
                  <span className="text-primary-600 font-semibold text-sm">
                    {user?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'CD'}
                  </span>
                }
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.full_name || 'Conductor'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || 'Conductor'}</p>
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
      <div className="flex-1 flex flex-col min-w-0 animate-fade-in">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="lg:hidden h-14 flex items-center px-4">
            <button className="p-2 text-gray-600 hover:text-gray-800" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="ml-3 text-lg font-bold text-purple-600">Conductor Panel</h1>
          </div>

          <div className="hidden lg:flex items-center justify-between px-8 h-16">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-800">{currentPageLabel}</h2>
              <nav className="flex items-center gap-1 text-sm text-gray-500">
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.path} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3" />}
                    {i === breadcrumbs.length - 1 ? (
                      <span className="text-gray-800 font-medium">{crumb.label}</span>
                    ) : (
                      <Link to={crumb.path} className="hover:text-purple-600 transition-colors">{crumb.label}</Link>
                    )}
                  </span>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <ExternalLink className="h-4 w-4" /> View Site
              </Link>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  <Avatar
                    src={user?.profile_image_url}
                    className="w-full h-full object-cover"
                    fallback={
                      <span className="text-primary-600 font-semibold text-xs">
                        {user?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'CD'}
                      </span>
                    }
                  />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">{user?.full_name || 'Conductor'}</p>
                  <p className="text-xs text-gray-500">Conductor</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
