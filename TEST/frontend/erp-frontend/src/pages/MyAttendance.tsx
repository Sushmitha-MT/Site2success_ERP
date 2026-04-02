import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle, Calendar, Timer } from 'lucide-react';

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

// ── MyAttendance Page ─────────────────────────────────────────────────────────
const MyAttendance: React.FC = () => {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<'in' | 'out' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: today, isLoading: todayLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      const resp = await api.get('/attendance/today');
      return resp.data;
    },
    refetchInterval: 30000,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['attendance-my'],
    queryFn: async () => {
      const resp = await api.get('/attendance/my');
      return resp.data;
    },
  });

  const handleClockIn = async () => {
    setActionLoading('in');
    setMessage(null);
    try {
      await api.post('/attendance/clock-in');
      setMessage({ type: 'success', text: 'Clocked in successfully!' });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-my'] });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to clock in.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleClockOut = async () => {
    setActionLoading('out');
    setMessage(null);
    try {
      await api.post('/attendance/clock-out');
      setMessage({ type: 'success', text: 'Clocked out successfully!' });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-my'] });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to clock out.' });
    } finally {
      setActionLoading(null);
    }
  };

  const isClockedIn = !!today?.is_checked_in;
  const activeSession = today?.current_session;
  const lastSession = today?.last_session;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-black text-neutral-900">My Attendance</h2>
        <p className="text-neutral-500 mt-1">Track your daily check-in and check-out</p>
      </header>

      {/* Today's Status Card */}
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8 card-lift">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
            <Calendar size={24} className="text-orange-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-neutral-900 tracking-tight">Today's Status</h3>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {todayLoading ? (
          <div className="h-32 bg-neutral-50 rounded-3xl animate-pulse mb-8" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Check-in */}
            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6 transition-colors hover:bg-orange-50">
              <div className="flex items-center gap-2 mb-3">
                <LogIn size={16} className="text-orange-500" />
                <span className="text-[11px] font-black uppercase tracking-widest text-orange-600">Check-In</span>
              </div>
              <p className="text-3xl font-black text-neutral-900 tracking-tight">
                {activeSession?.clock_in
                  ? formatTime(activeSession.clock_in)
                  : lastSession?.clock_in
                  ? formatTime(lastSession.clock_in)
                  : '—'}
              </p>
              {(activeSession?.clock_in || lastSession?.clock_in) && (
                <p className="text-xs text-orange-500 font-bold mt-2">
                  {formatDate(activeSession?.clock_in || lastSession?.clock_in)}
                </p>
              )}
            </div>

            {/* Check-out */}
            <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <LogOut size={16} className="text-orange-700" />
                <span className="text-[11px] font-black uppercase tracking-widest text-orange-700">Check-Out</span>
              </div>
              <p className="text-3xl font-black text-neutral-900 tracking-tight">
                {isClockedIn ? (
                  <span className="text-orange-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                    Working…
                  </span>
                ) : lastSession?.clock_out ? (
                  formatTime(lastSession.clock_out)
                ) : (
                  '—'
                )}
              </p>
            </div>

            {/* Working hours HH:MM */}
            <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Timer size={16} className="text-orange-700" />
                <span className="text-[11px] font-black uppercase tracking-widest text-orange-700">Total Work</span>
              </div>
              <p className="text-3xl font-black text-neutral-900 font-mono tracking-tighter">
                {isClockedIn
                  ? '—'
                  : lastSession
                  ? formatDuration(lastSession.clock_in, lastSession.clock_out, lastSession.total_hours)
                  : '—'}
              </p>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-2">Daily Session Hours</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={handleClockIn}
            disabled={isClockedIn || actionLoading === 'in'}
            className="group relative flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            {actionLoading === 'in' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : <LogIn size={20} className="group-hover:rotate-12 transition-transform" />}
            Check In
          </button>

          <button
            onClick={handleClockOut}
            disabled={!isClockedIn || actionLoading === 'out'}
            className="group relative flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-white bg-orange-700 hover:bg-orange-800 shadow-lg shadow-orange-700/25 hover:shadow-orange-700/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            {actionLoading === 'out' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : <LogOut size={20} className="group-hover:rotate-12 transition-transform" />}
            Check Out
          </button>
        </div>

        {/* Status message */}
        {message && (
          <div className={`mt-8 px-6 py-4 rounded-2xl flex items-center gap-4 text-sm font-bold shadow-sm border ${
            message.type === 'success'
              ? 'bg-orange-50 text-orange-700 border-orange-100'
              : 'bg-red-50 text-red-700 border-red-100'
          } animate-slide-up`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.type === 'success' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            </div>
            {message.text}
          </div>
        )}
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="px-10 py-8 border-b border-neutral-50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-neutral-900 tracking-tight">History</h3>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Activity Log — Last 30 days</p>
          </div>
          <div className="flex gap-2">
             <div className="px-4 py-2 bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 border border-neutral-100 italic">
               All times in HH:MM
             </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-50/50 text-[10px] uppercase font-black text-neutral-400 tracking-[0.2em]">
              <tr>
                <th className="px-10 py-6">Date</th>
                <th className="px-10 py-6">Check-In</th>
                <th className="px-10 py-6">Check-Out</th>
                <th className="px-10 py-6">Duration</th>
                <th className="px-10 py-6">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {historyLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-10 py-6 h-20 bg-neutral-50/20" colSpan={5} />
                  </tr>
                ))
              ) : Array.isArray(history) && history.length > 0 ? (
                history.map((log: any) => {
                  const duration = formatDuration(log.clock_in, log.clock_out, log.total_hours);
                  const stillWorking = log.clock_in && !log.clock_out;
                  return (
                    <tr key={log.id} className="hover:bg-orange-50/30 transition-colors group">
                      <td className="px-10 py-6 font-black text-neutral-900 text-sm group-hover:text-orange-600 transition-colors uppercase tracking-tight">{formatDate(log.clock_in)}</td>
                      <td className="px-10 py-6 text-sm text-neutral-600 font-bold">{formatTime(log.clock_in)}</td>
                      <td className="px-10 py-6 text-sm text-neutral-600 font-bold">{formatTime(log.clock_out)}</td>
                      <td className="px-10 py-6">
                        {stillWorking ? (
                          <span className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-600 flex items-center gap-2 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-neutral-100 text-neutral-600 font-mono w-fit block">
                            {duration}
                          </span>
                        )}
                      </td>
                      <td className="px-10 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] ${
                          log.source === 'jibble' ? 'bg-neutral-100 text-neutral-600' : 'bg-neutral-100 text-neutral-400'
                        }`}>
                          {log.source || 'manual'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Clock size={40} className="text-neutral-200" />
                    </div>
                    <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyAttendance;
