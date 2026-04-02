import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { Users, Calendar, Clock, Search, Filter, ArrowUp, ArrowDown, Download, ChevronUp, ChevronDown } from 'lucide-react';

// ── Utility: format duration as HH:MM ────────────────────────────────────────
const formatDuration = (clockIn: string | null, clockOut: string | null, totalHours?: number | null): string => {
  if (totalHours != null) {
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  if (!clockIn || !clockOut) return '—';
  const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  if (diffMs <= 0) return '00:00';
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatTime = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ── TeamAttendance Page ───────────────────────────────────────────────────────
const TeamAttendance: React.FC = () => {
  const [employeeName, setEmployeeName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: logs, isLoading, error, refetch } = useQuery({
    queryKey: ['attendance-team', employeeName, startDate, endDate, statusFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (employeeName) params.append('employee_name', employeeName);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (statusFilter) params.append('status_filter', statusFilter);
      if (sortBy) params.append('sort_by', sortBy);
      if (sortOrder) params.append('sort_order', sortOrder);

      const resp = await api.get(`/attendance/team?${params.toString()}`);
      return resp.data;
    },
  });

  const handleDownload = async () => {
    try {
      const params = new URLSearchParams();
      if (employeeName) params.append('employee_name', employeeName);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (statusFilter) params.append('status_filter', statusFilter);
      if (sortBy) params.append('sort_by', sortBy);
      if (sortOrder) params.append('sort_order', sortOrder);

      const response = await api.get(`/attendance/download?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download attendance report.');
    }
  };

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ChevronDown size={14} className="opacity-20" />;
    return sortOrder === 'asc' ? <ChevronUp size={14} className="text-orange-500" /> : <ChevronDown size={14} className="text-orange-500" />;
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-neutral-900 tracking-tight">Attendence</h2>
          <p className="text-neutral-500 mt-1 font-medium">Daily attendance and session tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleDownload}
            className="bg-white hover:bg-neutral-50 text-neutral-900 font-black px-6 py-3 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Download size={18} className="text-orange-500" />
            Export CSV
          </button>
        </div>
      </header>

      {/* Filters Bar - Single Row */}
      <div className="bg-white p-4 rounded-[24px] border border-neutral-100 shadow-sm flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 ml-1">Search Personnel</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={16} />
            <input
              type="text"
              placeholder="Name..."
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold"
            />
          </div>
        </div>

        <div className="w-40">
          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 ml-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold"
          />
        </div>

        <div className="w-40">
          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 ml-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold"
          />
        </div>

        <div className="w-44">
          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="synced">Synced</option>
            <option value="issue">Issue</option>
          </select>
        </div>

        <button
          onClick={() => {
            setEmployeeName('');
            setStartDate('');
            setEndDate('');
            setStatusFilter('');
            setSortBy('date');
            setSortOrder('desc');
          }}
          className="px-6 py-3 text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-orange-500 transition-colors"
        >
          Clear
        </button>
      </div>

      {error ? (
        <div className="p-16 text-center bg-red-50 rounded-[40px] border border-red-100 shadow-2xl shadow-red-500/5">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <AlertCircle size={40} className="text-red-500" />
          </div>
          <p className="text-red-600 font-black uppercase tracking-widest text-sm">Security Restriction</p>
          <p className="text-red-400 text-xs mt-2 font-bold">You lack the necessary privileges coordinates for this dataset.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border border-neutral-100 shadow-sm overflow-hidden min-h-[500px]">
          <div className="px-10 py-8 border-b border-neutral-50 flex items-center justify-between">
            <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Activity Log</h3>
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 shadow-inner">
              <Users size={20} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-50/50 text-[10px] uppercase font-black text-neutral-400 tracking-[0.2em]">
                <tr>
                  <th className="px-10 py-6 cursor-pointer hover:bg-neutral-100/50 transition-colors" onClick={() => toggleSort('employee')}>
                    <div className="flex items-center gap-2">
                      Personnel <SortIcon column="employee" />
                    </div>
                  </th>
                  <th className="px-10 py-6 cursor-pointer hover:bg-neutral-100/50 transition-colors" onClick={() => toggleSort('date')}>
                    <div className="flex items-center gap-2">
                      Timestamp (Date) <SortIcon column="date" />
                    </div>
                  </th>
                  <th className="px-10 py-6 cursor-pointer hover:bg-neutral-100/50 transition-colors" onClick={() => toggleSort('clock_in')}>
                    <div className="flex items-center gap-2">
                      Session Start <SortIcon column="clock_in" />
                    </div>
                  </th>
                  <th className="px-10 py-6 cursor-pointer hover:bg-neutral-100/50 transition-colors" onClick={() => toggleSort('clock_out')}>
                    <div className="flex items-center gap-2">
                      Session End <SortIcon column="clock_out" />
                    </div>
                  </th>
                  <th className="px-10 py-6">Net Duration</th>
                  <th className="px-10 py-6 cursor-pointer hover:bg-neutral-100/50 transition-colors" onClick={() => toggleSort('status')}>
                    <div className="flex items-center gap-2">
                      Status <SortIcon column="status" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {isLoading ? (
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-10 py-6 h-20 bg-neutral-50/20" colSpan={6} />
                    </tr>
                  ))
                ) : Array.isArray(logs) && logs.length > 0 ? (
                  logs.map((log: any) => {
                    const duration = formatDuration(log.clock_in, log.clock_out, log.total_hours);
                    const stillWorking = log.clock_in && !log.clock_out;
                    return (
                      <tr key={log.id} className="hover:bg-orange-50/30 transition-all group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-orange-500 font-black text-sm border-2 border-white shadow-xl shadow-neutral-900/10 group-hover:scale-110 transition-transform">
                              {(log.user_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-extrabold text-neutral-900 text-sm group-hover:text-orange-600 transition-colors uppercase tracking-tight">{log.user_name || 'System User'}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-xs text-neutral-500 font-bold uppercase tracking-widest">{formatDate(log.clock_in)}</td>
                        <td className="px-10 py-6 text-sm text-neutral-600 font-bold">{formatTime(log.clock_in)}</td>
                        <td className="px-10 py-6 text-sm text-neutral-600 font-bold">{formatTime(log.clock_out)}</td>
                        <td className="px-10 py-6">
                          {stillWorking ? (
                            <span className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-600 flex items-center gap-2 w-fit">
                              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                              Active Now
                            </span>
                          ) : (
                            <span className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-neutral-100 text-neutral-400 font-mono w-fit block">
                              {duration}
                            </span>
                          )}
                        </td>
                        <td className="px-10 py-6">
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border ${stillWorking
                            ? 'bg-orange-50 text-orange-600 border-orange-100'
                            : log.clock_out
                              ? 'bg-neutral-50 text-neutral-400 border-neutral-100'
                              : 'bg-red-50 text-red-500 border-red-100'
                            }`}>
                            {stillWorking ? 'ACTIVE' : log.clock_out ? 'SYNCED' : 'ISSUE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Users size={48} className="text-neutral-300" />
                      </div>
                      <p className="text-neutral-400 font-black uppercase tracking-[0.2em] text-xs">No attendance records found for selected filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const AlertCircle = ({ size, className }: { size: number; className?: string }) => <Clock size={size} className={className} />;

export default TeamAttendance;
