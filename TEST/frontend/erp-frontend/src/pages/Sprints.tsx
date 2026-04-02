import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintsApi } from '../api/sprints';
import { projectsApi } from '../api/projects';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Zap, Calendar, Play, LayoutGrid } from 'lucide-react';

const Sprints: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: sprints, isLoading: sprintsLoading } = useQuery({
    queryKey: ['sprints'],
    queryFn: sprintsApi.getSprints
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects
  });

  const createMutation = useMutation({
    mutationFn: sprintsApi.createSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      setIsModalOpen(false);
      setName('');
      setProjectId('');
      setStartDate('');
      setEndDate('');
    }
  });

  const activateMutation = useMutation({
    mutationFn: sprintsApi.activateSprint,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprints'] })
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return alert("Project is required.");
    createMutation.mutate({ 
      name, 
      project_id: projectId,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    });
  };

  const canManageOptions = user?.role === 'super_admin' || user?.role === 'project_manager';

  // Group sprints by project
  const sprintsByProject = Array.isArray(sprints) ? sprints.reduce((acc: any, sprint: any) => {
    if (!acc[sprint.project_id]) acc[sprint.project_id] = [];
    acc[sprint.project_id].push(sprint);
    return acc;
  }, {}) : {};

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-neutral-900">Sprints</h2>
          <p className="text-neutral-500 mt-1">Manage project iteration cycles</p>
        </div>
        {canManageOptions && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={20} />
            New Sprint
          </button>
        )}
      </header>

      {sprintsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-neutral-100 rounded-3xl animate-pulse" />)}
        </div>
      ) : !sprintsByProject || Object.keys(sprintsByProject).length === 0 ? (
        <div className="p-20 text-center bg-neutral-50 rounded-4xl border-2 border-dashed border-neutral-200">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-400 mx-auto mb-6">
            <Zap size={40} />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 mb-2">No sprints found</h3>
          <p className="text-neutral-500 mb-8 max-w-sm mx-auto">Sprints break down your project into manageable time-boxed chunks.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(sprintsByProject).map(([projId, projSprints]: [string, any]) => {
            const project = projects?.find((p: any) => p.id === projId);
            return (
              <div key={projId} className="bg-white p-8 rounded-4xl border border-neutral-100 shadow-sm">
                <h3 className="text-2xl font-black text-neutral-900 mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400">
                    <LayoutGrid size={16} />
                  </div>
                  {project?.name || 'Unknown Project'}
                  <span className="text-sm font-medium text-neutral-400 bg-neutral-50 px-3 py-1 rounded-full">{projSprints.length} sprints</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projSprints.map((sprint: any) => (
                    <div key={sprint.id} className={`p-6 rounded-3xl border-2 transition-all group ${
                      sprint.is_active ? 'border-indigo-500 bg-indigo-50/30' : 'border-neutral-100 hover:border-neutral-200 bg-white'
                    }`}>
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-extrabold text-neutral-900 text-lg">{sprint.name}</h4>
                        {sprint.is_active && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                            <Zap size={12} fill="currentColor" /> Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs font-semibold text-neutral-500 mb-6">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} className="text-neutral-400" />
                          {sprint.start_date ? new Date(sprint.start_date).toLocaleDateString() : 'TBD'}
                        </div>
                        <div className="text-neutral-300">-</div>
                        <div className="flex items-center gap-1">
                          {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString() : 'TBD'}
                        </div>
                      </div>

                      {canManageOptions && !sprint.is_active && (
                        <button 
                          onClick={() => activateMutation.mutate(sprint.id)}
                          disabled={activateMutation.isPending}
                          className="w-full py-2.5 rounded-xl text-sm font-bold text-neutral-600 bg-neutral-50 hover:bg-neutral-100 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Play size={16} />
                          Activate Sprint
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Sprint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <Zap className="text-indigo-500" /> New Sprint
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Sprint Name *</label>
                <input required value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="E.g., Sprint 1: Foundation" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Project *</label>
                <select required value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                  <option value="">Select Target Project</option>
                  {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-neutral-500 font-bold hover:bg-neutral-50 rounded-xl transition-colors">Cancel</button>
                <button disabled={createMutation.isPending} type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50">
                  {createMutation.isPending ? 'Creating...' : 'Create Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sprints;
