import { useState } from 'react';
import { Code, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface Endpoint {
  method: string;
  path: string;
  description: string;
  requiresAuth: boolean;
  roles?: string[];
  body?: Record<string, string>;
}

const endpoints: Record<string, Endpoint[]> = {
  Authentication: [
    { method: 'POST', path: '/api/auth/register', description: 'Register a new user', requiresAuth: false, body: { email: 'string', password: 'string', full_name: 'string', phone_number: 'string' } },
    { method: 'POST', path: '/api/auth/login', description: 'Login and get access token', requiresAuth: false, body: { phone_number: 'string', password: 'string' } },
    { method: 'POST', path: '/api/auth/send-otp', description: 'Send OTP for verification', requiresAuth: false, body: { phone_number: 'string' } },
    { method: 'POST', path: '/api/auth/verify-otp', description: 'Verify OTP code', requiresAuth: false, body: { phone_number: 'string', otp: 'string' } },
    { method: 'PUT', path: '/api/auth/change-password', description: 'Change password', requiresAuth: true, body: { current_password: 'string', new_password: 'string' } },
  ],
  Trips: [
    { method: 'GET', path: '/api/trips/search', description: 'Search available trips', requiresAuth: false },
    { method: 'GET', path: '/api/trips/:id', description: 'Get trip details', requiresAuth: false },
    { method: 'GET', path: '/api/trips/:id/seats', description: 'Get trip seat layout', requiresAuth: true },
    { method: 'POST', path: '/api/trips', description: 'Create a new trip', requiresAuth: true, roles: ['OPERATOR'] },
    { method: 'PUT', path: '/api/trips/:id', description: 'Update trip details', requiresAuth: true, roles: ['OPERATOR'] },
    { method: 'PUT', path: '/api/trips/:id/status', description: 'Update trip status', requiresAuth: true, roles: ['OPERATOR'] },
  ],
  Bookings: [
    { method: 'POST', path: '/api/bookings', description: 'Create a new booking', requiresAuth: true, body: { trip_id: 'number', passengers: 'Passenger[]' } },
    { method: 'GET', path: '/api/bookings', description: 'Get user bookings', requiresAuth: true },
    { method: 'GET', path: '/api/bookings/pnr/:pnr', description: 'Get booking by PNR', requiresAuth: true },
    { method: 'POST', path: '/api/bookings/:id/cancel', description: 'Cancel a booking', requiresAuth: true },
  ],
  Payments: [
    { method: 'POST', path: '/api/payments/initiate', description: 'Initiate payment', requiresAuth: true, body: { booking_id: 'number', payment_method: 'string', amount: 'number' } },
    { method: 'POST', path: '/api/payments/:id/verify', description: 'Verify payment status', requiresAuth: true },
    { method: 'GET', path: '/api/payments/:id/callback', description: 'Payment gateway callback', requiresAuth: false },
  ],
  SeatLocks: [
    { method: 'POST', path: '/api/seat-locks', description: 'Lock seats for booking', requiresAuth: true, body: { trip_id: 'number', seat_numbers: 'string[]' } },
    { method: 'GET', path: '/api/seat-locks/active', description: 'Get active seat locks', requiresAuth: true },
    { method: 'DELETE', path: '/api/seat-locks/:id', description: 'Release seat lock', requiresAuth: true },
  ],
  Reports: [
    { method: 'GET', path: '/api/reports/bookings', description: 'Generate booking report', requiresAuth: true, roles: ['SUPER_ADMIN', 'OPERATOR'] },
    { method: 'GET', path: '/api/reports/revenue', description: 'Generate revenue report', requiresAuth: true, roles: ['SUPER_ADMIN', 'OPERATOR'] },
  ],
  Admin: [
    { method: 'GET', path: '/api/dashboard/admin', description: 'Get admin dashboard stats', requiresAuth: true, roles: ['SUPER_ADMIN'] },
    { method: 'GET', path: '/api/admin/operators', description: 'List all operators', requiresAuth: true, roles: ['SUPER_ADMIN'] },
    { method: 'POST', path: '/api/admin/operators', description: 'Register new operator', requiresAuth: true, roles: ['SUPER_ADMIN'] },
    { method: 'GET', path: '/api/admin/users', description: 'List all users', requiresAuth: true, roles: ['SUPER_ADMIN'] },
    { method: 'PUT', path: '/api/admin/users/:id/status', description: 'Update user status', requiresAuth: true, roles: ['SUPER_ADMIN'] },
  ],
};

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

export default function ApiDocsPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Authentication');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Code className="h-8 w-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">API Documentation</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Base URL</h2>
        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
          <code className="flex-1 text-sm font-mono text-gray-700">http://localhost:3000/api</code>
          <button
            onClick={() => copyToClipboard('http://localhost:3000/api')}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            {copiedPath === 'http://localhost:3000/api' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(endpoints).map(([category, categoryEndpoints]) => (
          <div key={category} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
            >
              <h3 className="text-lg font-semibold text-gray-800">{category}</h3>
              {expandedCategory === category ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
            </button>

            {expandedCategory === category && (
              <div className="border-t divide-y">
                {categoryEndpoints.map((endpoint, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${methodColors[endpoint.method]}`}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono text-gray-700">{endpoint.path}</code>
                      <button
                        onClick={() => copyToClipboard(`http://localhost:3000${endpoint.path}`)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {copiedPath === `http://localhost:3000${endpoint.path}` ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{endpoint.description}</p>
                    <div className="flex items-center gap-2 text-xs">
                      {endpoint.requiresAuth && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">Auth Required</span>
                      )}
                      {endpoint.roles && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          Roles: {endpoint.roles.join(', ')}
                        </span>
                      )}
                    </div>
                    {endpoint.body && (
                      <div className="mt-3 bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs font-medium text-gray-500 mb-2">Request Body:</p>
                        <pre className="text-xs font-mono text-gray-700">
                          {JSON.stringify(endpoint.body, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
