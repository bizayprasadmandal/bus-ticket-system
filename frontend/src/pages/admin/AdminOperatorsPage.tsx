import { useState, useEffect, useMemo } from 'react';
import { UserCog, Plus, X, Search, Edit, Trash2, ChevronLeft, ChevronRight, Building2, Phone, Calendar } from 'lucide-react';
import { adminOperatorAPI } from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface OperatorItem {
  id: number;
  company_name: string;
  company_name_nepali: string;
  contact_person: string;
  contact_phone: string;
  email?: string;
  status: string;
  commission_rate?: number;
  created_at: string;
}

export default function AdminOperatorsPage() {
  const [operators, setOperators] = useState<OperatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<OperatorItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState({
    company_name: '',
    company_name_nepali: '',
    contact_person: '',
    contact_phone: '',
    email: '',
    password: '',
    commission_rate: 10,
  });

  const itemsPerPage = 10;

  useEffect(() => { loadOperators(); }, []);

  const loadOperators = async () => {
    try {
      const res = await adminOperatorAPI.getAll();
      setOperators(res.data.data.operators || []);
    } catch { toast.error('Failed to load operators'); } finally { setLoading(false); }
  };

  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      const matchesSearch =
        op.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.contact_phone.includes(searchQuery);
      const matchesStatus = statusFilter === 'ALL' || op.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [operators, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredOperators.length / itemsPerPage);
  const paginatedOperators = filteredOperators.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOperator) {
        await adminOperatorAPI.update(editingOperator.id, form);
        toast.success('Operator updated');
      } else {
        await adminOperatorAPI.create(form);
        toast.success('Operator registered');
      }
      setShowModal(false);
      setEditingOperator(null);
      setForm({ company_name: '', company_name_nepali: '', contact_person: '', contact_phone: '', email: '', password: '', commission_rate: 10 });
      loadOperators();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleEdit = (operator: OperatorItem) => {
    setEditingOperator(operator);
    setForm({
      company_name: operator.company_name,
      company_name_nepali: operator.company_name_nepali || '',
      contact_person: operator.contact_person,
      contact_phone: operator.contact_phone,
      email: operator.email || '',
      password: '',
      commission_rate: operator.commission_rate || 10,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number, companyName: string) => {
    if (!confirm(`Are you sure you want to delete "${companyName}"?`)) return;
    try {
      await adminOperatorAPI.update(id, { status: 'SUSPENDED' });
      toast.success('Operator suspended');
      loadOperators();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to deactivate');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'APPROVED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'INACTIVE':
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return <TableSkeleton rows={4} cols={5} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Operators</h1>
          <p className="text-sm text-gray-500 mt-1">Manage bus operators and their accounts</p>
        </div>
        <button
          onClick={() => {
            setEditingOperator(null);
            setForm({ company_name: '', company_name_nepali: '', contact_person: '', contact_phone: '', email: '', password: '', commission_rate: 10 });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Register Operator
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Operators</p>
          <p className="text-2xl font-bold text-gray-800">{operators.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{operators.filter(o => o.status === 'ACTIVE' || o.status === 'APPROVED').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{operators.filter(o => o.status === 'PENDING').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Inactive</p>
          <p className="text-2xl font-bold text-red-600">{operators.filter(o => o.status === 'INACTIVE' || o.status === 'REJECTED').length}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by company, contact person, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Contact</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Commission</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Registered</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedOperators.map((op) => (
                <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{op.company_name}</p>
                        {op.company_name_nepali && (
                          <p className="text-xs text-gray-400">{op.company_name_nepali}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{op.contact_person}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      {op.contact_phone}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(op.status)}`}>
                      {op.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{op.commission_rate || 10}%</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(op.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(op)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(op.id, op.company_name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deactivate"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedOperators.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <UserCog className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No operators found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredOperators.length)} of {filteredOperators.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingOperator ? 'Edit Operator' : 'Register Operator'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingOperator(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name *</label>
                <input
                  placeholder="Enter company name"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name (Nepali)</label>
                <input
                  placeholder="कम्पनीको नाम"
                  value={form.company_name_nepali}
                  onChange={(e) => setForm({ ...form, company_name_nepali: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Person *</label>
                <input
                  placeholder="Enter contact person name"
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone *</label>
                <input
                  placeholder="98XXXXXXXX"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  placeholder="company@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
              {!editingOperator && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                  <input
                    type="password"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                    minLength={6}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Commission Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.commission_rate}
                  onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {editingOperator ? 'Update Operator' : 'Register Operator'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}