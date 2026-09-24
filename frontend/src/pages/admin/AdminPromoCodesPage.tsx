import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tag, Search, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, X, Power, PowerOff, RefreshCw } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface PromoCode {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_amount: number;
  max_uses: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  status: 'ACTIVE' | 'EXPIRED' | 'DISABLED';
  description: string;
}

const emptyForm: Omit<PromoCode, 'id' | 'used_count' | 'status'> = {
  code: '',
  discount_type: 'percentage',
  discount_value: 0,
  min_amount: 0,
  max_uses: 0,
  valid_from: '',
  valid_until: '',
  description: '',
};

function deriveStatus(p: PromoCode): PromoCode['status'] {
  if (p.status === 'DISABLED') return 'DISABLED';
  if (p.valid_until && new Date(p.valid_until) < new Date()) return 'EXPIRED';
  if (p.max_uses > 0 && p.used_count >= p.max_uses) return 'EXPIRED';
  return 'ACTIVE';
}

export default function AdminPromoCodesPage() {
  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [form, setForm] = useState(emptyForm);

  const itemsPerPage = 8;

  const loadPromos = useCallback(async () => {
    try {
      const res = await api.get('/admin/promo-codes', { params: { page: 1, limit: 1000 } });
      const items = (res.data.data.items || []).map((p: any) => ({
        ...p,
        discount_value: Number(p.discount_value) || 0,
        min_amount: Number(p.min_amount) || 0,
        max_uses: Number(p.max_uses) || 0,
        used_count: Number(p.used_count) || 0,
        status: deriveStatus(p),
      }));
      setPromos(items);
    } catch {
      toast.error('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadPromos, 30000);
  useEffect(() => { loadPromos(); }, [loadPromos]);

  const totalCodes = promos.length;
  const activeCount = promos.filter(p => p.status === 'ACTIVE').length;
  const expiredCount = promos.filter(p => p.status === 'EXPIRED').length;
  const totalUsage = promos.reduce((sum, p) => sum + p.used_count, 0);

  const filteredPromos = useMemo(() => {
    let result = promos;
    if (statusFilter !== 'ALL') result = result.filter(p => p.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.code.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return result;
  }, [promos, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPromos.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPromos = filteredPromos.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const openCreateModal = () => {
    setEditingPromo(null);
    setForm({ ...emptyForm, code: generateCode() });
    setShowModal(true);
  };

  const openEditModal = (promo: PromoCode) => {
    setEditingPromo(promo);
    setForm({
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      min_amount: promo.min_amount,
      max_uses: promo.max_uses,
      valid_from: promo.valid_from?.slice(0, 10),
      valid_until: promo.valid_until?.slice(0, 10),
      description: promo.description,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.code || !form.discount_value || !form.valid_from || !form.valid_until) {
      toast.error('Please fill all required fields');
      return;
    }
    if (form.discount_type === 'percentage' && form.discount_value > 100) {
      toast.error('Percentage discount cannot exceed 100');
      return;
    }

    try {
      if (editingPromo) {
        await api.put(`/admin/promo-codes/${editingPromo.id}`, form);
        toast.success('Promo code updated');
      } else {
        await api.post('/admin/promo-codes', form);
        toast.success('Promo code created');
      }
      setShowModal(false);
      loadPromos();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      await api.delete(`/admin/promo-codes/${id}`);
      toast.success('Promo code deleted');
      loadPromos();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const toggleStatus = async (promo: PromoCode) => {
    try {
      await api.put(`/admin/promo-codes/${promo.id}`, { status: promo.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' });
      toast.success('Status updated');
      loadPromos();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      case 'EXPIRED': return 'bg-red-100 text-red-700';
      case 'DISABLED': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return <TableSkeleton rows={5} cols={8} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Tag className="h-6 w-6 text-[#d84e55]" /> Promo Codes
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage discount and promotional codes</p>
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-[#d84e55] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#c4434b] transition-colors"
        >
          <Plus className="h-4 w-4" /> Create Promo Code
        </button>
        {lastUpdated && <span className="text-xs text-gray-400">{lastUpdated.toLocaleTimeString()}</span>}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Total Codes</p>
          <p className="text-2xl font-bold text-gray-800">{totalCodes}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Expired</p>
          <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Total Usage</p>
          <p className="text-2xl font-bold text-gray-800">{totalUsage.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code or description..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Discount</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Min Amount</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Uses / Max</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Valid From</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Valid Until</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedPromos.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-[#d84e55]">{promo.code}</span>
                    <p className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate">{promo.description}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `NPR ${promo.discount_value}`}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">NPR {promo.min_amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {promo.used_count} / {promo.max_uses}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{new Date(promo.valid_from).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{new Date(promo.valid_until).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(promo.status)}`}>
                      {promo.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(promo)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(promo)}
                        className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title={promo.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                      >
                        {promo.status === 'ACTIVE' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedPromos.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No promo codes found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((safePage - 1) * itemsPerPage) + 1} to {Math.min(safePage * itemsPerPage, filteredPromos.length)} of {filteredPromos.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  return Math.abs(page - safePage) <= 1;
                })
                .reduce<(number | '...')[]>((acc, page, i, arr) => {
                  if (i > 0 && page - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(page);
                  return acc;
                }, [])
                .map((page, i) =>
                  page === '...' ? (
                    <span key={`gap-${i}`} className="px-1 text-gray-400">…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        safePage === page
                          ? 'bg-[#d84e55] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none font-mono"
                    placeholder="PROMOCODE"
                  />
                  {!editingPromo && (
                    <button
                      onClick={() => setForm(prev => ({ ...prev, code: generateCode() }))}
                      className="px-3 py-2 text-sm text-[#d84e55] bg-[#d84e55]/10 rounded-lg hover:bg-[#d84e55]/20 transition-colors"
                    >
                      Auto-generate
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                  placeholder="Enter description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm(prev => ({ ...prev, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (NPR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value *</label>
                  <input
                    type="number"
                    value={form.discount_value || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                    min={0}
                    max={form.discount_type === 'percentage' ? 100 : undefined}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Booking Amount</label>
                  <input
                    type="number"
                    value={form.min_amount || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, min_amount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                    min={0}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                  <input
                    type="number"
                    value={form.max_uses || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, max_uses: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                    min={0}
                    placeholder="Unlimited"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From *</label>
                  <input
                    type="date"
                    value={form.valid_from}
                    onChange={(e) => setForm(prev => ({ ...prev, valid_from: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm(prev => ({ ...prev, valid_until: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm text-white bg-[#d84e55] rounded-lg hover:bg-[#c4434b] transition-colors"
              >
                {editingPromo ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
