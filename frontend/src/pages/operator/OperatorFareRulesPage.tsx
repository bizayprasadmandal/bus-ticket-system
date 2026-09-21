import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Plus, Edit2, Trash2, X, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { fareRuleAPI } from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import toast from 'react-hot-toast';

const RULE_TYPES = [
  { value: 'PEAK_HOURS', label: 'Peak Hours' },
  { value: 'WEEKEND', label: 'Weekend' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'SEASONAL', label: 'Seasonal' },
  { value: 'DISCOUNT', label: 'Discount' },
];

const typeBadge: Record<string, string> = {
  PEAK_HOURS: 'bg-orange-100 text-orange-700',
  WEEKEND: 'bg-blue-100 text-blue-700',
  HOLIDAY: 'bg-red-100 text-red-700',
  SEASONAL: 'bg-green-100 text-green-700',
  DISCOUNT: 'bg-purple-100 text-purple-700',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface FareRuleForm {
  name: string;
  type: string;
  multiplier: number;
  discount_percent: number;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  route_id: string;
}

const emptyForm: FareRuleForm = {
  name: '',
  type: 'PEAK_HOURS',
  multiplier: 1.0,
  discount_percent: 0,
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  days_of_week: [],
  route_id: '',
};

export default function OperatorFareRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FareRuleForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fareRuleAPI.getAll();
      setRules(res.data.data.fare_rules || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      toast.error('Failed to load fare rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);
  useAutoRefresh(loadRules, 30000);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (rule: any) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name || '',
      type: rule.type || 'PEAK_HOURS',
      multiplier: parseFloat(rule.multiplier) || 1.0,
      discount_percent: parseFloat(rule.discount_percent) || 0,
      start_date: rule.start_date || '',
      end_date: rule.end_date || '',
      start_time: rule.start_time || '',
      end_time: rule.end_time || '',
      days_of_week: rule.days_of_week || [],
      route_id: rule.route_id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) {
      toast.error('Name and type are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        route_id: form.route_id ? parseInt(form.route_id) : null,
      };
      if (editingId) {
        await fareRuleAPI.update(editingId, payload);
        toast.success('Fare rule updated');
      } else {
        await fareRuleAPI.create(payload);
        toast.success('Fare rule created');
      }
      setShowModal(false);
      loadRules();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save fare rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this fare rule?')) return;
    try {
      await fareRuleAPI.delete(id);
      toast.success('Fare rule deleted');
      loadRules();
    } catch {
      toast.error('Failed to delete fare rule');
    }
  };

  const toggleActive = async (rule: any) => {
    try {
      await fareRuleAPI.update(rule.id, { is_active: !rule.is_active });
      toast.success(rule.is_active ? 'Rule deactivated' : 'Rule activated');
      loadRules();
    } catch {
      toast.error('Failed to update rule');
    }
  };

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <DollarSign className="h-6 w-6" style={{ color: '#d84e55' }} /> Fare Rules
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage peak hours, seasonal, and discount fare rules</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated {lastUpdated}</span>
          )}
          <button
            onClick={() => loadRules()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#d84e55' }}
          >
            <Plus className="h-4 w-4" /> Create Rule
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No fare rules configured yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Multiplier</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Discount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date Range</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Time</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{rule.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeBadge[rule.type] || 'bg-gray-100 text-gray-600'}`}>
                        {rule.type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{rule.multiplier}x</td>
                    <td className="px-4 py-3 text-right text-gray-600">{rule.discount_percent}%</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {rule.start_date && rule.end_date
                        ? `${rule.start_date} to ${rule.end_date}`
                        : rule.start_date || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {rule.start_time && rule.end_time
                        ? `${rule.start_time} - ${rule.end_time}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(rule)} className="text-gray-400 hover:text-gray-600">
                        {rule.is_active ? (
                          <ToggleRight className="h-6 w-6 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-gray-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(rule)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingId ? 'Edit Fare Rule' : 'Create Fare Rule'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55]/20 focus:border-[#d84e55] outline-none"
                  placeholder="e.g. Morning Peak"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55]/20 focus:border-[#d84e55] outline-none"
                  required
                >
                  {RULE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Multiplier</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={form.multiplier}
                    onChange={(e) => setForm({ ...form, multiplier: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55]/20 focus:border-[#d84e55] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.discount_percent}
                    onChange={(e) => setForm({ ...form, discount_percent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55]/20 focus:border-[#d84e55] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55]/20 focus:border-[#d84e55] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55]/20 focus:border-[#d84e55] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55]/20 focus:border-[#d84e55] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55]/20 focus:border-[#d84e55] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days of Week</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        form.days_of_week.includes(i)
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={form.days_of_week.includes(i) ? { backgroundColor: '#d84e55' } : {}}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#d84e55' }}
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
