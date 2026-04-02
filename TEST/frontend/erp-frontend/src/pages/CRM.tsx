import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { Users, Mail, Phone, MapPin, Search, Filter, X, Plus, CheckCircle, AlertCircle } from 'lucide-react';

// ── Form initial state ────────────────────────────────────────────────────────
const emptyForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  status: 'active',
};

type FormErrors = { [key: string]: string };

// ── Validation ────────────────────────────────────────────────────────────────
function validate(form: typeof emptyForm): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Client name is required';
  }

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address';
  }

  if (form.phone && !/^\d*$/.test(form.phone)) {
    errors.phone = 'Phone must contain only numbers';
  }

  return errors;
}

// ── Add Client Modal Component ────────────────────────────────────────────────
const AddClientModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ open, onClose, onSuccess }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/clients/', {
        name: form.name,
        company: form.company || '',
        email: form.email,
        phone: form.phone || null,
        address: form.address || null,
        status: form.status,
      });
      // Success — reset + close + refresh list
      setForm(emptyForm);
      setErrors({});
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setApiError(typeof detail === 'string' ? detail : 'Failed to create client. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(emptyForm);
    setErrors({});
    setApiError('');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 mx-4 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-black text-neutral-900">Add New Client</h3>
            <p className="text-sm text-neutral-400 mt-1">Fill in the details below</p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-xl bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center transition-colors"
          >
            <X size={18} className="text-neutral-500" />
          </button>
        </div>

        {/* API Error */}
        {apiError && (
          <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm border border-red-100">
            <AlertCircle size={18} />
            {apiError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Name */}
          <div>
            <label className="text-sm font-semibold text-neutral-700 mb-1 block">
              Client Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter client name"
              className={`w-full bg-neutral-50 border rounded-xl py-3 px-4 outline-none focus:ring-2 transition-all text-sm ${
                errors.name
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                  : 'border-neutral-100 focus:ring-amber-500/20 focus:border-amber-500'
              }`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Company Name */}
          <div>
            <label className="text-sm font-semibold text-neutral-700 mb-1 block">Company Name</label>
            <input
              type="text"
              name="company"
              value={form.company}
              onChange={handleChange}
              placeholder="Enter company name"
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
            />
          </div>

          {/* Email & Phone row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-neutral-700 mb-1 block">Email</label>
              <input
                type="text"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@company.com"
                className={`w-full bg-neutral-50 border rounded-xl py-3 px-4 outline-none focus:ring-2 transition-all text-sm ${
                  errors.email
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                    : 'border-neutral-100 focus:ring-amber-500/20 focus:border-amber-500'
                }`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-700 mb-1 block">Phone</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="9876543210"
                className={`w-full bg-neutral-50 border rounded-xl py-3 px-4 outline-none focus:ring-2 transition-all text-sm ${
                  errors.phone
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                    : 'border-neutral-100 focus:ring-amber-500/20 focus:border-amber-500'
                }`}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm font-semibold text-neutral-700 mb-1 block">Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter address"
              rows={2}
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-semibold text-neutral-700 mb-1 block">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 rounded-xl text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Save Client
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main CRM Page ─────────────────────────────────────────────────────────────
const CRM: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const resp = await api.get('/clients/');
      return resp.data;
    }
  });

  const handleSuccess = () => {
    // Refresh client list after adding
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-neutral-900">CRM / Clients</h2>
          <p className="text-neutral-500 mt-1">Manage client relationships and communication logs</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white border border-neutral-100 rounded-2xl px-4 py-2 flex items-center gap-3 text-sm text-neutral-500">
            <Search size={18} className="text-neutral-400" />
            <input type="text" placeholder="Search clients..." className="bg-transparent outline-none" />
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            Add Client
          </button>
        </div>
      </header>

      {error ? (
        <div className="p-12 text-center bg-red-50 rounded-3xl border border-red-100">
          <p className="text-red-600 font-medium">Failed to load CRM data.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-50/50 text-[10px] uppercase font-black text-neutral-400 tracking-widest">
              <tr>
                <th className="px-8 py-5">Client Name</th>
                <th className="px-8 py-5">Contact Details</th>
                <th className="px-8 py-5">Location</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-5 h-16 bg-neutral-50/20" colSpan={5} />
                  </tr>
                ))
              ) : Array.isArray(clients) && clients.length > 0 ? (
                clients.map((c: any) => (
                  <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                          {(c.company || c.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">{c.name}</p>
                          <p className="text-xs text-neutral-400 font-medium">{c.company || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1 text-sm text-neutral-500">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-neutral-300" />
                          {c.email || 'No email'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-neutral-300" />
                          {c.phone || 'No phone'}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-neutral-500">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-neutral-300" />
                        {c.address || 'No address'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        c.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="text-neutral-300 hover:text-amber-500 transition-colors">
                        <Filter size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-neutral-400 italic">No clients registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Client Modal */}
      <AddClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default CRM;
