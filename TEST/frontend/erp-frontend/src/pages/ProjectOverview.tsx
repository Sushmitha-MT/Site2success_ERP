import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projects';
import { tasksApi } from '../api/tasks';
import { financeApi } from '../api/finance';
import { getAllUsers } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { isAdminOrManager, isFinanceRole, canDeleteItems } from '../utils/roles';
import {
  ArrowLeft, Layers, Calendar, Plus, X, Edit2, Trash2,
  TrendingUp, TrendingDown, Wallet, CheckSquare, Clock,
  User as UserIcon, ChevronRight, DollarSign, AlertCircle, MessageCircle,
} from 'lucide-react';
import ProjectChatPanel from '../components/ProjectChatPanel';

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  todo: 'bg-neutral-100 text-neutral-600 font-bold',
  in_progress: 'bg-orange-100 text-orange-700 font-black',
  done: 'bg-orange-50 text-orange-600 font-bold',
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-50 text-red-600 font-bold',
  medium: 'bg-orange-50 text-orange-600 font-bold',
  low: 'bg-neutral-100 text-neutral-500 font-medium',
};

const fieldCls = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-medium';

// ── Kanban Column ─────────────────────────────────────────────────────────────
interface KanbanColProps {
  id: string;
  label: string;
  dot: string;
  tasks: any[];
  users: any[];
  onMove: (task: any, status: string) => void;
  onEdit: (task: any) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
  canDelete: boolean;
  currentUserId?: string;
}

const KanbanColumn: React.FC<KanbanColProps> = ({
  id, label, dot, tasks, users, onMove, onEdit, onDelete, canManage, canDelete, currentUserId,
}) => {
  const canMoveTask = (task: any) =>
    canManage || task.assignee_id === currentUserId;

  const prevStatus: Record<string, string> = { in_progress: 'todo', done: 'in_progress' };
  const nextStatus: Record<string, string> = { todo: 'in_progress', in_progress: 'done' };

  return (
    <div className="bg-neutral-50/70 rounded-3xl border border-neutral-100 p-5 flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
          <h3 className="font-extrabold text-neutral-900 text-sm">{label}</h3>
        </div>
        <span className="bg-white text-neutral-500 text-xs font-black px-2.5 py-1 rounded-lg border border-neutral-100 shadow-sm">
          {Array.isArray(tasks) ? tasks.length : 0}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {!Array.isArray(tasks) || tasks.length === 0 ? (
          <div className="h-28 border-2 border-dashed border-neutral-200 rounded-2xl flex items-center justify-center">
            <p className="text-neutral-400 text-xs font-medium">No tasks available</p>
          </div>
        ) : (
          tasks.map((task: any) => {
            const assignee = Array.isArray(users) ? users.find((u: any) => u.id === task.assignee_id) : null;
            return (
              <div key={task.id} className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all group">
                {/* Priority + actions */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${priorityColors[task.priority] || 'bg-neutral-100 text-neutral-500'}`}>
                    {task.priority || 'medium'}
                  </span>
                  {(canManage || task.assignee_id === currentUserId) && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canManage && (
                        <button onClick={() => onEdit(task)} className="p-2 text-neutral-300 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all">
                          <Edit2 size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => onDelete(task.id)} className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <h4 className="font-extrabold text-neutral-900 text-sm leading-snug mb-2 group-hover:text-orange-600 transition-colors">{task.title}</h4>

                {task.description && (
                  <p className="text-neutral-400 text-xs line-clamp-2 mb-4 leading-relaxed">{task.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400">
                      <UserIcon size={12} />
                    </div>
                    <span className="text-[10px] font-bold text-neutral-500">{assignee?.full_name || 'Unassigned'}</span>
                  </div>

                  <div className="flex gap-1.5">
                    {prevStatus[task.status] && (
                      <button
                        onClick={() => onMove(task, prevStatus[task.status])}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-50 text-neutral-400 hover:bg-orange-50 hover:text-orange-600 transition-all shadow-sm"
                      >
                        <ChevronRight size={14} className="rotate-180" />
                      </button>
                    )}
                    {nextStatus[task.status] && (
                      <button
                        onClick={() => onMove(task, nextStatus[task.status])}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all shadow-sm"
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const ProjectOverview: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const financeAccess = isFinanceRole(user?.role);
  const canManage = isAdminOrManager(user?.role);
  const canDelete = canDeleteItems(user?.role);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  const [editTask, setEditTask] = useState<any>(null);

  // Edit Task form
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  // Finance form
  const [finAmount, setFinAmount] = useState('');
  const [finType, setFinType] = useState('income');
  const [finDescription, setFinDescription] = useState('');
  const [finDate, setFinDate] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.getProjects });
  const project = projects?.find((p: any) => p.id === id);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => tasksApi.getTasks(id),
    enabled: !!id,
  });

  const { data: financeEntries = [], isLoading: financeLoading } = useQuery({
    queryKey: ['finance-entries', id],
    queryFn: () => financeApi.getFinanceEntries(id),
    enabled: !!id && financeAccess,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getAllUsers,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', id],
    queryFn: () => projectsApi.getMembers(id!),
    enabled: !!id,
  });

  // GOLDEN RULE: Strict Membership Check for Chat
  const isProjectPersonnel = useMemo(() => {
    if (!user || !project) return false;
    const isLead = project.manager_id === user.id;
    const isMember = members.some((m: any) => m.id === user.id);
    return isLead || isMember;
  }, [user, project, members]);

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createTaskMutation = useMutation({
    mutationFn: tasksApi.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsTaskModalOpen(false);
      setTaskTitle(''); setTaskDescription(''); setTaskAssignee(''); setTaskPriority('medium'); setTaskDueDate('');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) => tasksApi.updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditTask(null);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: tasksApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const createFinanceMutation = useMutation({
    mutationFn: financeApi.createFinanceEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-entries', id] });
      queryClient.invalidateQueries({ queryKey: ['finance-entries'] });
      setIsFinanceModalOpen(false);
      setFinAmount(''); setFinType('income'); setFinDescription(''); setFinDate('');
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const openEditTask = (task: any) => {
    setEditTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditAssignee(task.assignee_id || '');
    setEditStatus(task.status);
    setEditPriority(task.priority || 'medium');
    setEditDueDate(task.due_date || '');
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate({
      title: taskTitle,
      description: taskDescription || undefined,
      project_id: id!,
      assignee_id: taskAssignee || undefined,
      priority: taskPriority,
      status: 'todo',
      order_index: 0,
      due_date: taskDueDate || undefined,
    });
  };

  const handleEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    updateTaskMutation.mutate({
      taskId: editTask.id,
      data: {
        title: editTitle,
        description: editDescription || undefined,
        assignee_id: editAssignee || undefined,
        status: editStatus,
        priority: editPriority,
        due_date: editDueDate || undefined,
      },
    });
  };

  const handleMoveTask = (task: any, newStatus: string) => {
    updateTaskMutation.mutate({ taskId: task.id, data: { status: newStatus } });
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Delete this task?')) deleteTaskMutation.mutate(taskId);
  };

  const handleCreateFinance = (e: React.FormEvent) => {
    e.preventDefault();
    createFinanceMutation.mutate({
      amount: parseFloat(finAmount),
      type: finType,
      description: finDescription,
      project_id: id,
      date: finDate || undefined,
    });
  };

  if (tasksLoading || financeLoading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-6" />
        <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Loading Project Data...</p>
      </div>
    );
  }

  if (!project) return <div className="p-10 text-neutral-500 font-bold">Project not found</div>;

  const totalBudget = Array.isArray(financeEntries) ? financeEntries.reduce((sum, e) => sum + (e.type === 'income' ? e.amount : -e.amount), 0) : 0;
  const tasksDone = Array.isArray(tasks) ? tasks.filter(t => t.status === 'done').length : 0;

  return (
    <div className="min-h-screen bg-white p-4 md:p-10 space-y-10 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-neutral-100">
        <div className="space-y-4 max-w-2xl">
          <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-neutral-400 hover:text-neutral-900 transition-colors font-bold text-xs uppercase tracking-widest group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Projects
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-neutral-900 rounded-[28px] flex items-center justify-center text-white shadow-2xl">
              <Layers size={32} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-neutral-900 tracking-tight leading-none">{project.name}</h1>
              <p className="text-neutral-400 font-medium mt-2 leading-relaxed">{project.description || 'No specialized description provided for this initiative.'}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-neutral-50 px-5 py-3 rounded-2xl flex items-center gap-3 border border-neutral-100">
            <Calendar size={18} className="text-neutral-400" />
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">End Date</p>
              <p className="text-sm font-bold text-neutral-900">{project.end_date || 'TBD'}</p>
            </div>
          </div>
          <div className="bg-neutral-50 px-5 py-3 rounded-2xl flex items-center gap-3 border border-neutral-100">
            <Clock size={18} className="text-neutral-400" />
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Active Since</p>
              <p className="text-sm font-bold text-neutral-900">{new Date(project.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          {canManage && (
            <button onClick={() => setIsTaskModalOpen(true)} className="bg-neutral-900 text-white px-8 py-3.5 rounded-2xl font-black flex items-center gap-3 shadow-2xl shadow-neutral-900/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-[11px]">
              <Plus size={18} /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Analytics Brief */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-orange-50 p-8 rounded-[40px] border border-orange-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
              <CheckSquare size={24} />
            </div>
            <TrendingUp size={20} className="text-orange-500 opacity-30" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-neutral-900 tracking-tight">{tasksDone} / {Array.isArray(tasks) ? tasks.length : 0}</h3>
            <p className="text-orange-600/60 font-bold uppercase tracking-widest text-[10px] mt-1">Tasks Completed</p>
          </div>
        </div>

        <div className="bg-neutral-50 p-8 rounded-[40px] border border-neutral-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
              <DollarSign size={24} />
            </div>
            <TrendingDown size={20} className="text-neutral-400 opacity-30" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-neutral-900 tracking-tight">₹{totalBudget.toLocaleString()}</h3>
            <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px] mt-1">Current Balance</p>
          </div>
        </div>

        <div className="bg-neutral-50 p-8 rounded-[40px] border border-neutral-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-neutral-400 shadow-sm">
              <Wallet size={24} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-neutral-900 tracking-tight tracking-tight">Active</h3>
            <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px] mt-1">Project Status</p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Task Board</h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Real-time sync active</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <KanbanColumn
            id="todo" label="To Do" dot="bg-neutral-400"
            tasks={Array.isArray(tasks) ? tasks.filter(t => t.status === 'todo') : []}
            users={users} onMove={handleMoveTask} onEdit={openEditTask} onDelete={handleDeleteTask}
            canManage={canManage} canDelete={canDelete} currentUserId={user?.id}
          />
          <KanbanColumn
            id="in_progress" label="In Progress" dot="bg-orange-500"
            tasks={Array.isArray(tasks) ? tasks.filter(t => t.status === 'in_progress') : []}
            users={users} onMove={handleMoveTask} onEdit={openEditTask} onDelete={handleDeleteTask}
            canManage={canManage} canDelete={canDelete} currentUserId={user?.id}
          />
          <KanbanColumn
            id="done" label="Completed" dot="bg-green-500"
            tasks={Array.isArray(tasks) ? tasks.filter(t => t.status === 'done') : []}
            users={users} onMove={handleMoveTask} onEdit={openEditTask} onDelete={handleDeleteTask}
            canManage={canManage} canDelete={canDelete} currentUserId={user?.id}
          />
        </div>
      </div>

      {/* Finance Ledger */}
      {financeAccess && (
        <div className="space-y-6 pt-10 border-t border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Finance Ledger</h2>
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mt-1">Internal project transactions</p>
            </div>
            {canManage && (
              <button onClick={() => setIsFinanceModalOpen(true)} className="bg-orange-100 text-orange-700 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-200 transition-all">
                + Log Entry
              </button>
            )}
          </div>

          <div className="bg-neutral-50 rounded-[40px] border border-neutral-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-neutral-100">
                  <th className="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Description</th>
                  <th className="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Type</th>
                  <th className="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Amount</th>
                  <th className="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!Array.isArray(financeEntries) || financeEntries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-10 text-center text-neutral-400 font-bold text-xs uppercase tracking-widest">No transactions logged</td>
                  </tr>
                ) : (
                  Array.isArray(financeEntries) && financeEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-white transition-colors">
                      <td className="px-8 py-5 text-sm font-bold text-neutral-900">{entry.description}</td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${entry.type === 'income' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className={`px-8 py-5 text-sm font-black ${entry.type === 'income' ? 'text-orange-600' : 'text-red-500'}`}>
                        {entry.type === 'income' ? '+' : '-'} ₹{entry.amount.toLocaleString()}
                      </td>
                      <td className="px-8 py-5 text-sm text-neutral-400 font-bold">{new Date(entry.date).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Task Modal ─────────────────────────────────────────────────── */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
            <div className="px-10 py-8 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600"><CheckSquare size={20} /></div>
                  New Directive
                </h3>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Assign to {project.name}</p>
              </div>
              <button onClick={() => setIsTaskModalOpen(false)} className="p-3 hover:bg-white hover:shadow-sm rounded-2xl text-neutral-400 hover:text-neutral-900 transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateTask} className="p-10 space-y-6">
              <div>
                <label className="block text-xs font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">Task Objective *</label>
                <input required value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className={fieldCls} placeholder="Core goal of this task..." />
              </div>
              <div>
                <label className="block text-xs font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">Context / Details</label>
                <textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} className={`${fieldCls} min-h-[100px]`} placeholder="Additional information..."></textarea>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">Priority</label>
                  <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className={fieldCls}>
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">Critical Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">Deadline</label>
                  <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className={fieldCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">Personnel Assignment</label>
                <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} className={fieldCls}>
                  <option value="">Unassigned</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                </select>
              </div>
              <div className="pt-6 flex justify-end gap-4">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-8 py-3 text-neutral-400 font-bold hover:text-neutral-900 transition-all uppercase tracking-widest text-[10px]">Dismiss</button>
                <button disabled={createTaskMutation.isPending} type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-black px-10 py-4 rounded-[20px] shadow-xl shadow-orange-500/20 transition-all disabled:opacity-50 uppercase tracking-widest text-[11px]">
                  {createTaskMutation.isPending ? 'Deploying...' : 'Deploy Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Task Modal ─────────────────────────────────────────────────── */}
      {editTask && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2 text-neutral-900"><Edit2 size={18} /> Edit Directive</h3>
              <button onClick={() => setEditTask(null)} className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Title *</label>
                <input required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className={`${fieldCls} min-h-[80px]`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={fieldCls}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Priority</label>
                  <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className={fieldCls}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Assign To</label>
                  <select value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)} className={fieldCls}>
                    <option value="">Unassigned</option>
                    {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Due Date</label>
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className={fieldCls} />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-3">
                <button type="button" onClick={() => setEditTask(null)} className="px-5 py-2.5 text-neutral-500 font-bold hover:bg-neutral-50 rounded-xl transition-colors">Cancel</button>
                <button disabled={updateTaskMutation.isPending} type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all disabled:opacity-50">
                  {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Finance Entry Modal ────────────────────────────────────────── */}
      {isFinanceModalOpen && financeAccess && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-2"><DollarSign size={18} className="text-emerald-500" /> Add Finance Entry</h3>
              <button onClick={() => setIsFinanceModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateFinance} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Description *</label>
                <input required value={finDescription} onChange={(e) => setFinDescription(e.target.value)} className={fieldCls} placeholder="e.g. Server hosting Q1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Type *</label>
                  <select value={finType} onChange={(e) => setFinType(e.target.value)} className={fieldCls}>
                    <option value="income">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Amount (₹) *</label>
                  <input required type="number" min="0.01" step="0.01" value={finAmount} onChange={(e) => setFinAmount(e.target.value)} className={fieldCls} placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Date</label>
                <input type="date" value={finDate} onChange={(e) => setFinDate(e.target.value)} className={fieldCls} />
              </div>
              <div className="pt-3 flex justify-end gap-4">
                <button type="button" onClick={() => setIsFinanceModalOpen(false)} className="px-5 py-2.5 text-neutral-500 font-bold hover:bg-neutral-50 rounded-xl transition-colors uppercase tracking-widest text-[10px]">Cancel</button>
                <button disabled={createFinanceMutation.isPending} type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-black px-8 py-3 rounded-2xl shadow-xl shadow-orange-500/20 transition-all disabled:opacity-50 uppercase tracking-widest text-[11px]">
                  {createFinanceMutation.isPending ? 'Syncing...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Project Chat Panel ────────────────────────────────────────── */}
      {isProjectPersonnel && project && (
        <>
          {!isChatOpen && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-2xl bg-orange-500 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group border-4 border-white"
              title="Project Team Chat"
            >
              <MessageCircle size={24} className="group-hover:rotate-12 transition-transform" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            </button>
          )}
          <ProjectChatPanel
            projectId={project.id}
            projectName={project.name}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
          />
        </>
      )}
    </div>
  );
};

export default ProjectOverview;
