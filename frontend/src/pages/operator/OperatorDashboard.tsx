import { useState, useEffect } from 'react';
import { Bus, Route, Calendar, Ticket } from 'lucide-react';
import { dashboardAPI } from '../../api';
import toast from 'react-hot-toast';

interface Stats {
  total_buses?: number;
  total_routes?: number;
  total_trips?: number;
  total_bookings?: number;
  [key: string]: any;
}

export default function OperatorDashboard() {
  const [stats, setStats] = useState<Stats>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getOperator()
      .then((res) => setStats(res.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setIsLoading(false));
  }, []);

  const cards = [
    { label: 'Total Buses', value: stats.total_buses ?? 0, icon: Bus, color: 'bg-blue-500' },
    { label: 'Total Routes', value: stats.total_routes ?? 0, icon: Route, color: 'bg-green-500' },
    { label: 'Total Trips', value: stats.total_trips ?? 0, icon: Calendar, color: 'bg-purple-500' },
    { label: 'Total Bookings', value: stats.total_bookings ?? 0, icon: Ticket, color: 'bg-orange-500' },
  ];

  if (isLoading) {
    return <div className="text-center py-16 text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Operator Dashboard</h1>
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
