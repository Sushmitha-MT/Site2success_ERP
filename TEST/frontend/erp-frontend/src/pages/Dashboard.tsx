import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { tasksApi } from '../api/tasks';
import { financeApi } from '../api/finance';
import { useAuth } from '../context/AuthContext';
import { isFinanceRole } from '../utils/roles';
import {
  Briefcase,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  User as UserIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  textColor?: string;
  trend?: string;
}> = ({ title, value, icon: Icon, color, textColor = 'text-neutral-900', trend }) => (
  <div className="bg-white p-6 rounded-3xl card-lift">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/10`}>
        <Icon size={22} />
      </div>
      {trend && (
        <span className="flex items-center gap-1 text-orange-600 font-bold text-xs bg-orange-50 px-2 py-1 rounded-lg">
          <ArrowUpRight size={13} />
          {trend}
        </span>
      )}
    </div>
    <p className="text-neutral-500 text-sm font-medium">{title}</p>
    <h3 className={`text-3xl font-black ${textColor} mt-1 tracking-tight`}>{value}</h3>
  </div>
);

const SkeletonCard = () => (
  <div className="bg-white p-6 rounded-3xl border border-neutral-100 animate-pulse">
    <div className="w-12 h-12 bg-neutral-100 rounded-2xl mb-4" />
    <div className="h-4 bg-neutral-100 rounded w-24 mb-2" />
    <div className="h-8 bg-neutral-100 rounded w-16" />
  </div>
);

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const financeAccess = isFinanceRole(user?.role);

  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
  });

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getTasks(),
  });

  const { data: financeEntries, isLoading: financeLoading } = useQuery({
    queryKey: ['finance-entries'],
    queryFn: () => financeApi.getFinanceEntries(),
    enabled: financeAccess,
  });

  const isLoading = projectsLoading || tasksLoading || (financeAccess && financeLoading);
  const error = projectsError || tasksError;

  // Computed stats
  const totalProjects = Array.isArray(projects) ? projects.length : 0;
  const totalTasks = Array.isArray(tasks) ? tasks.length : 0;
  const myTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.assignee_id === user?.id).length : 0;

  const totalRevenue = financeAccess
    ? financeEntries?.filter((e: any) => e.type === 'income').reduce((s: number, e: any) => s + e.amount, 0) || 0
    : 0;
  const totalExpenses = financeAccess
    ? financeEntries?.filter((e: any) => e.type === 'expense').reduce((s: number, e: any) => s + e.amount, 0) || 0
    : 0;

  const tasksByStatus = {
    todo: Array.isArray(tasks) ? tasks.filter((t: any) => t.status === 'todo').length : 0,
    in_progress: Array.isArray(tasks) ? tasks.filter((t: any) => t.status === 'in_progress').length : 0,
    done: Array.isArray(tasks) ? tasks.filter((t: any) => t.status === 'done').length : 0,
  };

  const chartData = [
    { name: 'To Do', value: tasksByStatus.todo },
    { name: 'In Progress', value: tasksByStatus.in_progress },
    { name: 'Completed', value: tasksByStatus.done },
  ];
  const COLORS = ['#fdba74', '#f97316', '#ea580c'];

  const upcomingDeadlines = projects
    ? [...projects]
        .filter((p: any) => p.end_date && p.status === 'active')
        .sort((a: any, b: any) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
        .slice(0, 4)
    : [];

  if (error) return (
    <div className="bg-red-50 border border-red-100 p-8 rounded-3xl text-center">
      <p className="text-red-600 font-medium">Failed to load dashboard data. Please try again.</p>
      <button
        onClick={() => (window.location.href = '/login')}
        className="mt-4 text-orange-600 font-bold hover:underline"
      >
        Sign in again
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-black text-neutral-900 tracking-tight">Dashboard</h2>
          <p className="text-neutral-500 mt-1 font-medium">
            Welcome back, <span className="text-orange-600 underline decoration-orange-600/30 underline-offset-4 font-bold">{user?.full_name?.split(' ')[0] || 'there'}</span> 👋
          </p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-3 text-sm font-bold text-neutral-700">
          <Calendar size={18} className="text-orange-500" />
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </header>

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${financeAccess ? 'lg:grid-cols-5' : 'lg:grid-cols-3'} gap-6`}>
        {isLoading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
            {financeAccess && <><SkeletonCard /><SkeletonCard /></>}
          </>
        ) : (
          <>
            <StatCard title="Total Projects" value={totalProjects} icon={Briefcase} color="bg-orange-500" />
            <StatCard title="Total Tasks" value={totalTasks} icon={Clock} color="bg-orange-600" />
            <StatCard title="My Tasks" value={myTasks} icon={UserIcon} color="bg-orange-700" />
            {financeAccess && (
              <>
                <StatCard
                  title="Total Revenue"
                  value={`₹${totalRevenue.toLocaleString()}`}
                  icon={TrendingUp}
                  color="bg-orange-600"
                />
                <StatCard
                  title="Total Expenses"
                  value={`₹${totalExpenses.toLocaleString()}`}
                  icon={TrendingDown}
                  color="bg-orange-800"
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Charts + Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Task Distribution Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm flex flex-col hover:border-orange-100 transition-colors">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Task Distribution</h3>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-1">Status across all projects</p>
            </div>
            <Link to="/tasks" className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-sm font-bold hover:bg-orange-100 transition-colors flex items-center gap-2">
              View Task Board <ChevronRight size={14} />
            </Link>
          </div>
          <div className="h-72 w-full">
            {isLoading ? (
              <div className="w-full h-full bg-neutral-50 rounded-2xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F8FAFC" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }} />
                  <Tooltip
                    cursor={{ fill: '#FFF7ED' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={52}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Mini task summary */}
          {!isLoading && (
            <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-neutral-50">
              {[
                { label: 'To Do', count: tasksByStatus.todo, color: 'bg-orange-300' },
                { label: 'In Progress', count: tasksByStatus.in_progress, color: 'bg-orange-500' },
                { label: 'Completed', count: tasksByStatus.done, color: 'bg-orange-700' },
              ].map((s) => (
                <div key={s.label} className="bg-neutral-50/50 p-3 rounded-2xl flex items-center gap-3 border border-transparent hover:border-neutral-100 transition-all">
                  <div className={`w-3 h-3 rounded-full ${s.color} shadow-sm`} />
                  <div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{s.label}</p>
                    <p className="text-sm font-black text-neutral-900">{s.count}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm flex flex-col hover:border-orange-100 transition-colors">
          <h3 className="text-2xl font-black text-neutral-900 mb-6 tracking-tight">Upcoming Deadlines</h3>
          <div className="space-y-4 flex-1">
            {isLoading ? (
              [1, 2, 3].map((i) => <div key={i} className="h-20 bg-neutral-50 rounded-3xl animate-pulse" />)
            ) : upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((p: any) => {
                const daysLeft = Math.ceil(
                  (new Date(p.end_date).getTime() - Date.now()) / 86400000
                );
                const isUrgent = daysLeft <= 3;
                return (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="group block p-5 rounded-2xl border border-neutral-50 hover:border-orange-200 hover:bg-orange-50/30 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-extrabold text-neutral-900 leading-tight group-hover:text-orange-600 transition-colors uppercase tracking-tight text-sm">{p.name}</p>
                      <ChevronRight size={16} className="text-neutral-300 group-hover:text-orange-500 transition-all group-hover:translate-x-1" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        {isUrgent ? 'Urgent' : 'Active'}
                      </div>
                      <p className={`text-xs font-bold ${isUrgent ? 'text-red-500' : 'text-neutral-400'}`}>
                        {daysLeft} days remaining
                      </p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">All caught up!</p>
              </div>
            )}
          </div>

          {projects && projects.length > 0 && (
            <Link
              to="/projects"
              className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-neutral-900 text-white text-sm font-black hover:bg-neutral-800 transition-all shadow-lg active:scale-95"
            >
              Explore All Projects <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
