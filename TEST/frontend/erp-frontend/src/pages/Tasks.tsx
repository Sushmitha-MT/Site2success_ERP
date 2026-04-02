import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { tasksApi } from '../api/tasks';
import { projectsApi } from '../api/projects';
import { getAllUsers } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { isAdminOrManager, canDeleteItems } from '../utils/roles';
import {
  Plus, X, Trash2, Edit2, User as UserIcon, Calendar,
  ChevronRight, Layers, CheckSquare,
} from 'lucide-react';

const fieldCls = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-medium';

const priorityColors: Record<string, string> = {
  high: 'bg-red-50 text-red-600 font-bold',
  medium: 'bg-orange-50 text-orange-600 font-bold',
  low: 'bg-neutral-100 text-neutral-500 font-medium',
};

// ── Tasks (Global Kanban Board) ───────────────────────────────────────────────
const Tasks: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const canManage = isAdminOrManager(user?.role);
  const canDelete = canDeleteItems(user?.role);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);

  // Create form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Edit form
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getAllUsers,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getTasks(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
  });

  // Auto-populate assignee when a project is selected
  React.useEffect(() => {
    if (isCreateOpen && projectId && !assigneeId) {
      const selectedProject = projects?.find((p: any) => p.id === projectId);
      if (selectedProject?.manager_id) {
        setAssigneeId(selectedProject.manager_id);
      }
    }
  }, [projectId, isCreateOpen, projects]);

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: tasksApi.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCreateOpen(false);
      setTitle(''); setDescription(''); setProjectId(''); setPriority('medium'); setAssigneeId(''); setDueDate('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tasksApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditTask(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tasksApi.deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const openEdit = (task: any) => {
    setEditTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditStatus(task.status);
    setEditPriority(task.priority || 'medium');
    setEditAssigneeId(task.assignee_id || '');
    setEditDueDate(task.due_date || '');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return alert('Please select a project.');
    createMutation.mutate({
      title, description: description || undefined, project_id: projectId,
      priority, status: 'todo', order_index: 0,
      assignee_id: assigneeId || undefined, due_date: dueDate || undefined,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: editTask.id,
      data: {
        title: editTitle, description: editDescription || undefined,
        status: editStatus, priority: editPriority,
        assignee_id: editAssigneeId || undefined, due_date: editDueDate || undefined,
      },
    });
  };

  const handleMove = (task: any, newStatus: string) => {
    updateMutation.mutate({ id: task.id, data: { status: newStatus } });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this task?')) deleteMutation.mutate(id);
  };

  const canEdit = (task: any) =>
    canManage || task.assignee_id === user?.id;

  // ── Kanban columns ────────────────────────────────────────────────────────────
  const columns = [
    { id: 'todo', label: 'To Do', dot: 'bg-neutral-300', bg: 'bg-neutral-50/50' },
    { id: 'in_progress', label: 'In Progress', dot: 'bg-orange-500', bg: 'bg-orange-50/30' },
    { id: 'done', label: 'Completed', dot: 'bg-neutral-900', bg: 'bg-neutral-100/50' },
  ];

  const prevStatus: Record<string, string> = { in_progress: 'todo', done: 'in_progress' };
  const nextStatus: Record<string, string> = { todo: 'in_progress', in_progress: 'done' };

  return (
    <div className="space-y-8 flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-neutral-900 tracking-tight">Work Management</h2>
          <p className="text-neutral-500 mt-1 font-medium">Track Work Across All the projects</p>
        </div>
        {canManage && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={20} className="text-white" strokeWidth={3} /> New Task
          </button>
        )}
      </header>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px] items-start">
        {columns.map((col) => {
          const colTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.status === col.id) : [];
          return (
            <div key={col.id} className={`${col.bg} rounded-[32px] border border-neutral-100 p-8 flex flex-col transition-all`}>
              {/* Column header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${col.dot} shadow-sm`} />
                  <h3 className="font-black text-neutral-900 uppercase tracking-widest text-xs">{col.label}</h3>
                </div>
                <div className="bg-white text-neutral-900 text-[10px] font-black px-3 py-1 rounded-full border border-neutral-100 shadow-sm">
                  {colTasks.length} Units
                </div>
              </div>

              {/* Tasks */}
              <div className="flex-1 space-y-4">
                {tasksLoading ? (
                  [1, 2].map((i) => <div key={i} className="h-40 bg-white rounded-2xl border border-neutral-100 animate-pulse" />)
                ) : colTasks.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-neutral-200/60 rounded-3xl flex flex-col items-center justify-center text-center px-6">
                    <div className="w-12 h-12 bg-white rounded-2xl border border-neutral-100 flex items-center justify-center text-neutral-200 mb-4 shadow-sm">
                      <CheckSquare size={24} />
                    </div>
                    <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">No Active Tasks</p>
                  </div>
                ) : (
                  colTasks.map((task: any) => {
                    const assignee = users.find((u: any) => u.id === task.assignee_id);
                    const project = projects.find((p: any) => p.id === task.project_id);
                    return (
                      <div key={task.id} className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-xl transition-all duration-300 group card-lift border-b-4 border-b-transparent hover:border-b-orange-500">
                        {/* Top row */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-lg ${priorityColors[task.priority] || 'bg-neutral-100 text-neutral-500'}`}>
                              {task.priority || 'medium'}
                            </span>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                            {canManage && (
                              <button onClick={() => openEdit(task)} className="p-2 text-neutral-300 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all">
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDelete(task.id)} className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="font-extrabold text-neutral-900 text-base leading-tight mb-4 group-hover:text-orange-600 transition-colors">{task.title}</h4>

                        {/* Project badge */}
                        {project && (
                          <Link to={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()} className="block">
                            <div className="inline-flex items-center gap-2 text-[10px] font-black text-neutral-400 hover:text-orange-500 transition-colors uppercase tracking-widest mb-4">
                              <Layers size={12} className="text-orange-400" /> {project.name}
                            </div>
                          </Link>
                        )}

                        {/* Meta Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <div className="flex items-center gap-2">
                            {task.due_date && (
                              <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold uppercase tracking-wider bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-100">
                                <Calendar size={12} className="text-orange-400" />
                                <span>Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </div>
                            )}
                            {assignee && (
                              <span className="text-neutral-500 uppercase tracking-widest text-[9px] bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-100">
                                ASSIGNED: {assignee.full_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Move controls: Accessible to all users including employees */}
                        <div className="flex items-center justify-between pt-5 border-t border-neutral-50">
                          {prevStatus[col.id] ? (
                            <button
                              onClick={() => handleMove(task, prevStatus[col.id])}
                              className="text-[10px] font-black text-neutral-400 hover:text-orange-500 flex items-center gap-1.5 transition-all uppercase tracking-widest"
                            >
                              <ChevronRight className="rotate-180" size={14} strokeWidth={3} /> Back
                            </button>
                          ) : <span />}
                          {nextStatus[col.id] && (
                            <button
                              onClick={() => handleMove(task, nextStatus[col.id])}
                              className="text-[10px] font-black text-orange-600 hover:text-orange-700 flex items-center gap-1.5 transition-all uppercase tracking-widest"
                            >
                              Next <ChevronRight size={14} strokeWidth={3} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Create Task Modal ──────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight">New Task</h3>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Assign work into sequence</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-3 hover:bg-white hover:shadow-sm rounded-2xl text-neutral-400 hover:text-neutral-900 transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-10 space-y-6">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Title *</label>
                <input required value={title} onChange={(e) => setTitle(e.target.value)} className={fieldCls} placeholder="e.g. Integrate core telemetry" />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1"> Project *</label>
                <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} className={fieldCls}>
                  <option value="">-- Select Project --</option>
                  {Array.isArray(projects) && projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Details</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${fieldCls} resize-none`} placeholder="Specific mission objectives..." />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Assigned To</label>
                  <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={fieldCls}>
                    <option value="">Select</option>
                    {users
                      .filter((u: any) => u.full_name !== 'Admin User' && u.full_name !== 'Ram3')
                      .map((u: any) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} className={fieldCls}>
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Timeline</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={fieldCls} />
              </div>
              <div className="pt-6 flex justify-end gap-4">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-8 py-4 text-neutral-500 font-black transition-colors uppercase tracking-widest text-xs">Cancel</button>
                <button disabled={createMutation.isPending} type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                  {createMutation.isPending ? 'Syncing...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Task Modal ────────────────────────────────────────────────── */}
      {editTask && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600"><Edit2 size={20} /></div>
                  Edit Task
                </h3>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Update Task</p>
              </div>
              <button onClick={() => setEditTask(null)} className="p-3 hover:bg-white hover:shadow-sm rounded-2xl text-neutral-400 hover:text-neutral-900 transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleEdit} className="p-10 space-y-6">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Title *</label>
                <input required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} className={`${fieldCls} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Phase</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={fieldCls}>
                    <option value="todo">Phase: To do</option>
                    <option value="in_progress">Phase: In Progress</option>
                    <option value="done">Phase: Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Priority</label>
                  <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className={fieldCls}>
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High / Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Assigned To</label>
                  <select value={editAssigneeId} onChange={(e) => setEditAssigneeId(e.target.value)} className={fieldCls}>
                    <option value="">Unassigned</option>
                    {users
                      .filter((u: any) => u.full_name !== 'Admin User' && u.full_name !== 'Ram3')
                      .map((u: any) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Timeline</label>
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className={fieldCls} />
                </div>
              </div>
              <div className="pt-6 flex justify-end gap-4">
                <button type="button" onClick={() => setEditTask(null)} className="px-8 py-4 text-neutral-500 font-black uppercase tracking-widest text-xs">Discard</button>
                <button disabled={updateMutation.isPending} type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                  {updateMutation.isPending ? 'Updating...' : 'Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
