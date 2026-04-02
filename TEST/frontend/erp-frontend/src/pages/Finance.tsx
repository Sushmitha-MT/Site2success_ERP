import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../api/finance';
import { projectsApi } from '../api/projects';
import { useAuth } from '../context/AuthContext';
import { isFinanceRole } from '../utils/roles';
import Forbidden from './Forbidden';
import {
  DollarSign, Wallet, TrendingUp, TrendingDown, Receipt,
  Calendar, Plus as PlusIcon, X, Trash2, Download, Pencil,
} from 'lucide-react';

const fieldCls = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-medium';

const Finance: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasAccess = isFinanceRole(user?.role);

  // ── All hooks must be declared before any conditional return ─────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('income');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [isClientAdvance, setIsClientAdvance] = useState(false);
  const [clientName, setClientName] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [editingEntry, setEditingEntry] = useState<any>(null);

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['finance-entries'],
    queryFn: () => financeApi.getFinanceEntries(),
    enabled: hasAccess,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
    enabled: hasAccess,
  });

  const createMutation = useMutation({
    mutationFn: financeApi.createFinanceEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-entries'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => financeApi.updateFinanceEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-entries'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setAmount(''); setType('income'); setDescription(''); setProjectId(''); setEntryDate('');
    setIsClientAdvance(false); setClientName(''); setAdvanceAmount('');
    setEditingEntry(null);
  };

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteFinanceEntry,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance-entries'] }),
  });

  // Hard block — rendered after all hooks have been declared
  if (!hasAccess) return <Forbidden />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      amount: parseFloat(amount),
      type,
      description,
      project_id: projectId || null,
      date: entryDate || undefined,
      is_client_advance: isClientAdvance,
      client_name: clientName || null,
      advance_amount: isClientAdvance ? parseFloat(advanceAmount) : null,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setAmount(entry.amount.toString());
    setType(entry.type);
    setDescription(entry.description || '');
    setProjectId(entry.project_id || '');
    setEntryDate(entry.created_at ? new Date(entry.created_at).toISOString().split('T')[0] : '');
    setIsClientAdvance(entry.is_client_advance || false);
    setClientName(entry.client_name || '');
    setAdvanceAmount(entry.advance_amount ? entry.advance_amount.toString() : '');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this finance entry?')) deleteMutation.mutate(id);
  };

  const handleDownload = async () => {
    try {
      const data = await financeApi.downloadFinanceReport();
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `finance_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download finance report.');
    }
  };

  const totalRevenue = Array.isArray(entries) ? entries.filter((e: any) => e.type === 'income').reduce((s: number, e: any) => s + e.amount, 0) : 0;
  const totalExpenses = Array.isArray(entries) ? entries.filter((e: any) => e.type === 'expense').reduce((s: number, e: any) => s + e.amount, 0) : 0;
  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-neutral-900 tracking-tight">Finance</h2>
          <p className="text-neutral-500 mt-1 font-medium">Global revenue and expenditure management</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleDownload}
            className="bg-white hover:bg-neutral-50 text-neutral-900 font-black px-8 py-4 rounded-2xl border border-neutral-200 shadow-sm transition-all flex items-center gap-2 active:scale-95"
          >
            <Download size={20} className="text-orange-500" /> Download Report
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
          >
            <PlusIcon size={20} strokeWidth={3} /> Add Entry
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-sm card-lift">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center shadow-inner">
              <TrendingUp size={24} className="text-orange-500" />
            </div>
            <div>
              <p className="text-neutral-400 font-bold text-[10px] uppercase tracking-[0.2em]">Accounts Receivable</p>
              <h4 className="text-neutral-900 font-black text-sm">Total Revenue</h4>
            </div>
          </div>
          <p className="text-4xl font-black text-neutral-900 tracking-tight">₹{totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-sm card-lift">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center">
              <TrendingDown size={24} className="text-neutral-400" />
            </div>
            <div>
              <p className="text-neutral-400 font-bold text-[10px] uppercase tracking-[0.2em]">Accounts Payable</p>
              <h4 className="text-neutral-900 font-black text-sm">Total Expenses</h4>
            </div>
          </div>
          <p className="text-4xl font-black text-neutral-900 tracking-tight">₹{totalExpenses.toLocaleString()}</p>
        </div>

        <div className={`p-8 rounded-[32px] border card-lift ${netProfit >= 0 ? 'bg-white border-neutral-100 shadow-sm' : 'bg-red-50 border-red-100 shadow-sm'}`}>
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${netProfit >= 0 ? 'bg-orange-50' : 'bg-red-100'}`}>
              <Wallet size={24} className={netProfit >= 0 ? 'text-orange-500' : 'text-red-600'} />
            </div>
            <div>
              <p className={`font-bold text-[10px] uppercase tracking-[0.2em] ${netProfit >= 0 ? 'text-neutral-400' : 'text-red-400'}`}>Bottom Line</p>
              <h4 className={`font-black text-sm ${netProfit >= 0 ? 'text-neutral-900' : 'text-red-900'}`}>Net Position</h4>
            </div>
          </div>
          <p className="text-4xl font-black tracking-tight">
            <span className={netProfit >= 0 ? 'text-orange-600' : 'text-red-600'}>
              {netProfit >= 0 ? '+' : '-'}₹{Math.abs(netProfit).toLocaleString()}
            </span>
          </p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-[32px] border border-neutral-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="px-10 py-8 border-b border-neutral-50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Financial Ledger</h3>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Institutional Transaction Log</p>
          </div>
          <div className="flex gap-2">
            <div className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center text-neutral-300">
              <Receipt size={20} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-50/50 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-400">
              <tr>
                <th className="px-10 py-6">Description</th>
                <th className="px-10 py-6">Classification</th>
                <th className="px-10 py-6">Entity</th>
                <th className="px-10 py-6">Timestamp</th>
                <th className="px-10 py-6 text-right">Value (INR)</th>
                <th className="px-10 py-6">Client Advance</th>
                <th className="px-10 py-6">Advance Amount</th>
                <th className="px-10 py-6">Client Name</th>
                <th className="px-10 py-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {loadingEntries ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-10 py-6 h-20 bg-neutral-50/20" />
                  </tr>
                ))
              ) : Array.isArray(entries) && entries.length > 0 ? (
                entries.map((e: any) => {
                  const project = Array.isArray(projects) ? projects.find((p: any) => p.id === e.project_id) : null;
                  return (
                    <tr key={e.id} className="hover:bg-orange-50/30 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl shadow-sm ${e.type === 'income' ? 'bg-orange-50 text-orange-500' : 'bg-neutral-100 text-neutral-400'}`}>
                            <Receipt size={16} />
                          </div>
                          <span className="font-extrabold text-neutral-900 text-sm group-hover:text-orange-600 transition-colors uppercase tracking-tight">{e.description}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${e.type === 'income' ? 'bg-orange-100 text-orange-700' : 'bg-neutral-100 text-neutral-500'}`}>
                          {e.type === 'income' ? 'Credit' : 'Debit'}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-100">
                          {project?.name || 'Treasury'}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2 text-xs text-neutral-400 font-bold">
                          <Calendar size={14} className="text-orange-400/50" />
                          {e.created_at ? new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </div>
                      </td>
                      <td className={`px-10 py-6 text-right font-black text-base tracking-tighter ${e.type === 'income' ? 'text-orange-600' : 'text-neutral-900 opacity-60'}`}>
                        {e.type === 'income' ? '+' : '-'}₹{Number(e.amount).toLocaleString()}
                      </td>
                      <td className="px-10 py-6">
                        {e.is_client_advance ? (
                          <span className="px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-orange-100 text-orange-700">Yes</span>
                        ) : (
                          <span className="px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-neutral-100 text-neutral-400">No</span>
                        )}
                      </td>
                      <td className="px-10 py-6">
                        <span className="text-xs font-black text-orange-600">
                          {e.is_client_advance && e.advance_amount ? `₹${Number(e.advance_amount).toLocaleString()}` : '—'}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <span className="text-xs font-bold text-neutral-600">
                          {e.client_name || '—'}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(e)}
                            className="p-2.5 text-neutral-400 hover:text-orange-500 transition-all rounded-xl hover:bg-orange-50"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="p-2.5 text-neutral-400 hover:text-red-500 transition-all rounded-xl hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-10 py-24 text-center">
                    <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <DollarSign size={40} className="text-neutral-200" />
                    </div>
                    <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No active ledger items</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Entry Modal ──────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight">
                  {editingEntry ? 'Update Entry' : 'Finance Entry'}
                </h3>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">
                  {editingEntry ? 'Synchronize ledger modifications' : 'Post to general ledger'}
                </p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setEditingEntry(null); }} className="p-3 hover:bg-white hover:shadow-sm rounded-2xl text-neutral-400 hover:text-neutral-900 transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Entry Description *</label>
                <input required value={description} onChange={(e) => setDescription(e.target.value)} className={fieldCls} placeholder="e.g. Infrastructure Maintenance Q2" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Classification *</label>
                  <select required value={type} onChange={(e) => setType(e.target.value)} className={fieldCls}>
                    <option value="income">Credit (+)</option>
                    <option value="expense">Debit (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Amount</label>
                  <input required min="0.01" step="0.01" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={fieldCls} placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Associated Internal Project</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={fieldCls}>
                  <option value="">--Projects--</option>
                  {Array.isArray(projects) && projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Transaction Date</label>
                  <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Client Name</label>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className={fieldCls}
                    placeholder="Entity Name"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="clientAdvance"
                  checked={isClientAdvance}
                  onChange={(e) => setIsClientAdvance(e.target.checked)}
                  className="w-5 h-5 rounded border-neutral-300 text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="clientAdvance" className="text-sm font-bold text-neutral-700 cursor-pointer">Client Advance</label>
              </div>

              {isClientAdvance && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Advance Amount *</label>
                  <input
                    required={isClientAdvance}
                    type="number"
                    min="0"
                    step="0.01"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    className={fieldCls}
                    placeholder="0.00"
                  />
                </div>
              )}
              <div className="pt-6 flex justify-end gap-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingEntry(null); }} className="px-8 py-4 text-neutral-500 font-black uppercase tracking-widest text-xs">Dismiss</button>
                <button disabled={createMutation.isPending || updateMutation.isPending} type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                  {createMutation.isPending || updateMutation.isPending ? 'Syncing...' : (editingEntry ? 'Update Transaction' : 'Add Transaction')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
