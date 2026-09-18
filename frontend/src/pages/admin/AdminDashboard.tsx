import { useState, useEffect } from 'react';
import { Users, UserCog, Ticket, DollarSign } from 'lucide-react';
import { dashboardAPI } from '../../api';
import toast from 'react-hot-toast';

interface Stats {
  total_users?: number;
  total_operators?: number;
  total_bookings?: number;
  total_revenue?: number;
  [key: string]: any;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getAdmin()
      .then((res) => setStats(res.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setIsLoading(false));
  }, []);

  const cards = [
    { label: 'Total Users', value: stats.total_users ?? 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Operators', value: stats.total_operators ?? 0, icon: UserCog, color: 'bg-green-500' },
    { label: 'Total Bookings', value: stats.total_bookings ?? 0, icon: Ticket, color: 'bg-purple-500' },
    { label: 'Total Revenue', value: `Rs. ${(stats.total_revenue ?? 0).toLocaleString()}`, icon: DollarSign, color: 'bg-orange-500', isText: true },
  ];

  if (isLoading) {
    return <div className="text-center py-16 text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
