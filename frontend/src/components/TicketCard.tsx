import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';

interface Passenger {
  full_name: string;
  age: number;
  gender: string;
  seat_number: string;
  id_type?: string;
  id_number?: string;
}

interface Booking {
  pnr: string;
  trip: {
    origin_city: string;
    destination_city: string;
    trip_date: string;
    departure_time: string;
    arrival_time: string;
    bus: {
      bus_number: string;
      bus_type: string;
    };
  };
  passengers: Passenger[];
  total_amount: number;
  payment_method?: string;
}

export default function TicketCard({ booking }: { booking: Booking }) {
  const handleDownload = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #ticket-card, #ticket-card * { visibility: visible; }
          #ticket-card { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id="ticket-card" className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-2xl mx-auto overflow-hidden">
        {/* Header */}
        <div className="bg-[#d84e55] text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              Samaya Deluxe
            </h1>
            <p className="text-xs opacity-80 mt-0.5">E-TICKET</p>
          </div>
          <div className="text-right">
            <QRCodeSVG
              value={booking.pnr}
              size={80}
              bgColor="#d84e55"
              fgColor="#ffffff"
              level="M"
            />
          </div>
        </div>

        {/* Trip Info */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">PNR</span>
                <p className="font-mono font-bold text-lg text-[#d84e55]">{booking.pnr}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Route</span>
                <p className="font-semibold">
                  {booking.trip.origin_city} → {booking.trip.destination_city}
                </p>
              </div>
              <div className="flex gap-6">
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Date</span>
                  <p className="font-medium">{booking.trip.trip_date}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Departure</span>
                  <p className="font-medium">{booking.trip.departure_time}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Arrival</span>
                  <p className="font-medium">{booking.trip.arrival_time}</p>
                </div>
              </div>
            </div>
            <div className="text-right space-y-1 text-sm">
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Bus No.</span>
                <p className="font-semibold">{booking.trip.bus.bus_number}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Bus Type</span>
                <p className="font-medium">{booking.trip.bus.bus_type}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Amount</span>
                <p className="font-bold text-[#d84e55]">NPR {booking.total_amount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Passenger Table */}
        <div className="px-6 py-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Passengers</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase">
                <th className="text-left py-2 font-medium">#</th>
                <th className="text-left py-2 font-medium">Name</th>
                <th className="text-left py-2 font-medium">Age</th>
                <th className="text-left py-2 font-medium">Gender</th>
                <th className="text-left py-2 font-medium">Seat</th>
                <th className="text-left py-2 font-medium">ID</th>
              </tr>
            </thead>
            <tbody>
              {booking.passengers.map((p, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 text-gray-400">{i + 1}</td>
                  <td className="py-2 font-medium">{p.full_name}</td>
                  <td className="py-2">{p.age}</td>
                  <td className="py-2 capitalize">{p.gender}</td>
                  <td className="py-2 font-mono font-semibold text-[#d84e55]">{p.seat_number}</td>
                  <td className="py-2 text-gray-500">{p.id_type && p.id_number ? `${p.id_type}: ${p.id_number}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Present this ticket at boarding. Carry valid ID.
          </p>
        </div>

        {/* Download Button */}
        <div className="no-print px-6 pb-4">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 bg-[#d84e55] text-white py-2.5 rounded-lg font-medium hover:bg-[#c44349] transition-colors"
          >
            <Download className="h-4 w-4" />
            Download Ticket
          </button>
        </div>
      </div>
    </>
  );
}
