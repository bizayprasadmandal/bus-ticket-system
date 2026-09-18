import { useState, useEffect } from 'react';
import { UserCog, Plus, X } from 'lucide-react';
import { adminOperatorAPI } from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface OperatorItem {
  id: number;
  company_name: string;
  company_name_nepali: string;
  contact_person: string;
  contact_phone: string;
  status: string;
  created_at: string;
}

export default function AdminOperatorsPage() {
  const [operators, setOperators] = useState<OperatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ company_name: '', company_name_nepali: '', contact_person: '', contact_phone: '', email: '', password: '' });

  useEffect(() => { loadOperators(); }, []);

  const loadOperators = async () => {
    try {
      const res = await adminOperatorAPI.getAll();
      setOperators(res.data.data.operators || []);
    } catch { toast.error('Failed to load operators'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminOperatorAPI.create(form);
      toast.success('Operator registered');
      setShowModal(false);
      setForm({ company_name: '', company_name_nepali: '', contact_person: '', contact_phone: '', email: '', password: '' });
      loadOperators();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <TableSkeleton rows={4} cols={5} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Operators</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Register Operator
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Company</th>
              <th className="px-4 py-3 font-medium text-gray-600">Contact Person</th>
              <th className="px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {operators.map((op) => (
              <tr key={op.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium flex items-center gap-2"><UserCog className="h-4 w-4 text-blue-500" /> {op.company_name}</td>
                <td className="px-4 py-3 text-gray-600">{op.contact_person}</td>
                <td className="px-4 py-3 text-gray-600">{op.contact_phone}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${op.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {op.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{new Date(op.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {operators.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No operators found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Register Operator</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input placeholder="Company Name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              <input placeholder="Company Name (Nepali)" value={form.company_name_nepali} onChange={(e) => setForm({ ...form, company_name_nepali: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              <input placeholder="Contact Person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              <input placeholder="Contact Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Register</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
