import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { getAllUsers } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { isAdminOrManager, canDeleteItems } from '../utils/roles';
import {
  Layers,
  Plus,
  MoreVertical,
  X,
  Calendar,
  Trash2,
  Edit2,
  ArrowRight,
  UserPlus,
  CheckCircle,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  active: 'bg-orange-100 text-orange-700 font-black',
  completed: 'bg-neutral-100 text-neutral-600 font-bold',
  planning: 'bg-orange-50 text-orange-600 font-bold',
  inactive: 'bg-neutral-100 text-neutral-400 font-medium',
};

// ── Projects Page ─────────────────────────────────────────────────────────────
const Projects: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canManage = isAdminOrManager(user?.role);
  const canDelete = canDeleteItems(user?.role);

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<any>(null);
  const [addMemberProject, setAddMemberProject] = useState<any>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [projectType, setProjectType] = useState('project');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [managerId, setManagerId] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editProjectType, setEditProjectType] = useState('project');
  const [editEndDate, setEditEndDate] = useState('');
  const [editManagerId, setEditManagerId] = useState('');

  // Add Member
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getAllUsers,
    enabled: canManage,
  });

  const { data: existingMembers = [], refetch: refetchMembers } = useQuery({
    queryKey: ['projectMembers', addMemberProject?.id],
    queryFn: () => projectsApi.getMembers(addMemberProject.id),
    enabled: !!addMemberProject,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateOpen(false);
      resetCreateForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => projectsApi.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditProject(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.deleteProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const bulkAddMutation = useMutation({
    mutationFn: ({ projectId, userIds }: { projectId: string; userIds: string[] }) =>
      projectsApi.bulkAddMembers(projectId, userIds),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(res.message || 'Team updated successfully');
      setAddMemberProject(null);
      setSelectedUserIds([]);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to update team';
      toast.error(msg);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const resetCreateForm = () => {
    setName(''); setDescription(''); setStatus('active'); setProjectType('project'); setStartDate(''); setEndDate(''); setManagerId('');
  };

  const openEdit = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditProject(p);
    setEditName(p.name);
    setEditDescription(p.description || '');
    setEditStatus(p.status);
    setEditProjectType(p.project_type || 'project');
    setEditEndDate(p.end_date || '');
    setEditManagerId(p.manager_id || '');
    setActiveDropdown(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, description, status, project_type: projectType, manager_id: managerId || undefined, start_date: startDate || undefined, end_date: endDate || undefined });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ id: editProject.id, data: { name: editName, description: editDescription, status: editStatus, project_type: editProjectType, manager_id: editManagerId, end_date: editEndDate || undefined } });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this project? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
    setActiveDropdown(null);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;
    bulkAddMutation.mutate({ projectId: addMemberProject.id, userIds: selectedUserIds });
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // ── Shared field style ────────────────────────────────────────────────────────
  const fieldCls = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-medium';

  return (
    <div className="space-y-8 relative" onClick={() => setActiveDropdown(null)}>
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-neutral-900 tracking-tight">Projects</h2>
          <p className="text-neutral-500 mt-1 font-medium">Coordinate and track all organizational efforts</p>
        </div>
        {canManage && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:scale-[1.02] text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/25 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={20} strokeWidth={3} /> New Project
          </button>
        )}
      </header>

      {/* Content */}
      {error ? (
        <div className="p-12 text-center bg-red-50 rounded-3xl border border-red-100 animate-shake">
          <p className="text-red-600 font-black">System error: Failed to fetch projects.</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-neutral-100 rounded-3xl animate-pulse" />)}
        </div>
      ) : projects?.length === 0 ? (
        <div className="p-24 text-center bg-white rounded-[40px] border border-neutral-100 shadow-sm">
          <div className="w-24 h-24 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-400 mx-auto mb-8 shadow-inner">
            <Layers size={48} />
          </div>
          <h3 className="text-2xl font-black text-neutral-900 mb-3 tracking-tight">Clean Slate</h3>
          <p className="text-neutral-500 mb-10 max-w-sm mx-auto font-medium">Ready to start something big? Create your first project and begin your journey.</p>
          {canManage && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="text-orange-600 font-extrabold flex items-center gap-2 mx-auto hover:text-orange-700 transition-colors uppercase tracking-widest text-xs"
            >
              <Plus size={18} /> Add first project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((p: any) => (
            <div
              key={p.id}
              className="bg-white p-8 rounded-[32px] card-lift group cursor-pointer flex flex-col relative overflow-hidden"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              {/* Active indicator bar */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Card Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-500 group-hover:text-white group-hover:rotate-6 transition-all duration-500 shadow-sm shadow-orange-500/5">
                  <Layers size={26} />
                </div>
                {canManage && (
                  <div className="relative z-20" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === p.id ? null : p.id); }}
                      className="text-neutral-300 hover:text-orange-500 p-2 rounded-xl hover:bg-orange-50 transition-all"
                    >
                      <MoreVertical size={20} />
                    </button>
                    {activeDropdown === p.id && (
                      <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-2xl border border-neutral-100 py-2 z-50 animate-in fade-in zoom-in duration-200">
                        <button
                          onClick={(e) => openEdit(p, e)}
                          className="w-full text-left px-5 py-3 text-sm text-neutral-700 hover:bg-orange-50 hover:text-orange-600 font-bold flex gap-3 items-center transition-colors"
                        >
                          <Edit2 size={16} /> Edit Details
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setAddMemberProject(p); setActiveDropdown(null); }}
                          className="w-full text-left px-5 py-3 text-sm text-neutral-900 hover:bg-neutral-50 font-bold flex gap-3 items-center transition-colors"
                        >
                          <UserPlus size={16} /> Add Collaborator
                        </button>
                        <div className="my-1 border-t border-neutral-50" />
                        {canDelete && (
                          <button
                            onClick={(e) => handleDelete(p.id, e)}
                            className="w-full text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50 font-bold flex gap-3 items-center transition-colors"
                          >
                            <Trash2 size={16} /> Remove Project
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-black text-neutral-900 mb-2 line-clamp-1 group-hover:text-orange-600 transition-colors tracking-tight">{p.name}</h3>
              <p className="text-neutral-500 text-sm line-clamp-2 flex-1 leading-relaxed font-medium opacity-80 mb-6">
                {p.description || 'No specialized description provided for this initiative.'}
              </p>

              {/* Dates, Type & Lead */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {(p.end_date || p.project_type || p.manager_id) && (
                  <div className="flex items-center gap-2 text-xs text-neutral-400 font-bold bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-100">
                    <Calendar size={14} className="text-orange-400" />
                    {p.end_date && (
                      <span>Due: {new Date(p.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    )}
                    {(p.end_date && (p.project_type || p.manager_id)) && <span className="opacity-30">|</span>}
                    {p.project_type && (
                      <span className="text-orange-600 uppercase tracking-widest text-[9px]">{p.project_type}</span>
                    )}
                    {p.project_type && p.manager_id && <span className="opacity-30">|</span>}
                    {p.manager_id && (
                      <span className="text-neutral-500 uppercase tracking-widest text-[9px]">
                        Lead: {users.find((u: any) => u.id === p.manager_id)?.full_name || 'Admin'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-neutral-50">
                <span className={`px-4 py-1.5 rounded-xl text-[10px] uppercase tracking-widest ${statusColors[p.status] || 'bg-neutral-100 text-neutral-500'}`}>
                  {p.status}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-black text-orange-600 group-hover:translate-x-1 transition-transform uppercase tracking-wider">
                  Details <ArrowRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Project Modal ─────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Create Project</h3>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Start a new project</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-3 hover:bg-white hover:shadow-sm rounded-2xl text-neutral-400 hover:text-neutral-900 transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-10 space-y-6">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Project Identifier *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} type="text" className={fieldCls} placeholder="e.g. Q4 Marketing Campaign" />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1"> Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${fieldCls} resize-none`} placeholder="Describe the goals and scope..." />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Commencement</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Deadline</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={fieldCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Operational Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldCls}>
                    <option value="planning">Phase: Planning</option>
                    <option value="active">Phase: Active</option>
                    <option value="inactive">Phase: Inactive</option>
                    <option value="completed">Phase: Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Project Category</label>
                  <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={fieldCls}>
                    <option value="project">Project Plan</option>
                    <option value="product">Product Build</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Project Lead</label>
                <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={fieldCls}>
                  <option value="">--Select --</option>
                  {users
                    .filter((u: any) => u.full_name !== 'Admin User' && u.full_name !== 'Ram3')
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                    ))}
                </select>
              </div>
              <div className="pt-6 flex justify-end gap-4">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-8 py-4 text-neutral-500 font-black hover:text-neutral-900 transition-colors uppercase tracking-widest text-xs">Cancel</button>
                <button disabled={createMutation.isPending} type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50">
                  {createMutation.isPending ? 'Syncing...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Project Modal ───────────────────────────────────────────────── */}
      {editProject && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600"><Edit2 size={20} /></div>
                  Modify Project
                </h3>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Update operational parameters</p>
              </div>
              <button onClick={() => setEditProject(null)} className="p-3 hover:bg-white hover:shadow-sm rounded-2xl text-neutral-400 hover:text-neutral-900 transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-10 space-y-6">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Project Title *</label>
                <input required value={editName} onChange={(e) => setEditName(e.target.value)} type="text" className={fieldCls} />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className={`${fieldCls} resize-none`} />
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={fieldCls}>
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Category</label>
                  <select value={editProjectType} onChange={(e) => setEditProjectType(e.target.value)} className={fieldCls}>
                    <option value="project">Project</option>
                    <option value="product">Product</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">End Date</label>
                  <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className={fieldCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 px-1">Project Lead (Manager)</label>
                <select value={editManagerId} onChange={(e) => setEditManagerId(e.target.value)} className={fieldCls}>
                  <option value="">-- Change Lead --</option>
                  {users
                    .filter((u: any) => u.full_name !== 'Admin User' && u.full_name !== 'Ram3')
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </option>
                    ))}
                </select>
              </div>
              <div className="pt-6 flex justify-end gap-4">
                <button type="button" onClick={() => setEditProject(null)} className="px-8 py-4 text-neutral-500 font-black transition-colors uppercase tracking-widest text-xs">Discard</button>
                <button disabled={updateMutation.isPending} type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                  {updateMutation.isPending ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Member Modal ─────────────────────────────────────────────────── */}
      {addMemberProject && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
              <div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600"><UserPlus size={20} /></div>
                  Invite User
                </h3>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1 truncate max-w-[200px]">to {addMemberProject.name}</p>
              </div>
              <button onClick={() => setAddMemberProject(null)} className="p-3 hover:bg-white hover:shadow-sm rounded-2xl text-neutral-400 hover:text-neutral-900 transition-all"><X size={24} /></button>
            </div>
            <div className="p-10 space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="text"
                  placeholder="Search users by name or role..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className={`${fieldCls} pl-12`}
                />
              </div>

              {/* Checklist Area */}
              <div className="bg-neutral-50 rounded-3xl border border-neutral-100 overflow-hidden">
                <div className="px-6 py-4 bg-white border-b border-neutral-100 flex justify-between items-center">
                  <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">Organizational Directory</span>
                  <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                    {selectedUserIds.length} Selected
                  </span>
                </div>
                
                <div className="max-h-72 overflow-y-auto p-4 space-y-2">
                  {users
                    .filter((u: any) => {
                      const search = memberSearch.toLowerCase();
                      return u.full_name?.toLowerCase().includes(search) || u.role?.toLowerCase().includes(search);
                    })
                    .map((u: any) => {
                      const isLead = addMemberProject.manager_id === u.id;
                      const isMember = existingMembers.some((em: any) => em.id === u.id);
                      const isExisting = isMember || isLead;
                      const isSelected = selectedUserIds.includes(u.id);
                      
                      return (
                        <div 
                          key={u.id}
                          onClick={() => !isExisting && toggleUserSelection(u.id)}
                          className={`flex items-center gap-4 p-4 rounded-2xl transition-all border ${
                            isExisting 
                              ? 'bg-neutral-100/50 border-transparent opacity-60 cursor-not-allowed'
                              : isSelected
                                ? 'bg-orange-50 border-orange-200'
                                : 'bg-white border-neutral-50 hover:border-orange-200 cursor-pointer'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isExisting
                              ? 'bg-neutral-300 border-neutral-300'
                              : isSelected
                                ? 'bg-orange-500 border-orange-500'
                                : 'bg-white border-neutral-200'
                          }`}>
                            {(isExisting || isSelected) && <CheckCircle size={14} className="text-white" strokeWidth={3} />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm truncate ${isExisting ? 'text-neutral-400' : 'text-neutral-900'}`}>
                              {u.full_name || 'Anonymous User'}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-400">
                              {u.role || 'Member'}
                            </p>
                          </div>
                          
                          {isExisting && (
                            <span className="text-[9px] font-black text-neutral-400 uppercase bg-neutral-200 px-2 py-1 rounded-md whitespace-nowrap">
                              {isLead ? 'Project Lead' : 'Already Added'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => { setAddMemberProject(null); setSelectedUserIds([]); }} 
                  className="px-8 py-4 text-neutral-500 font-black uppercase tracking-widest text-xs"
                >
                  Dismiss
                </button>
                <button 
                  disabled={bulkAddMutation.isPending || selectedUserIds.length === 0} 
                  onClick={handleAddMember}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                >
                  {bulkAddMutation.isPending ? 'Syncing...' : 'Assign Collaborators'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
