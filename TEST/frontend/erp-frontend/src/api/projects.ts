import api from './axiosInstance';

export const projectsApi = {
  getProjects: async () => {
    const response = await api.get('/projects/');
    return response.data;
  },

  getProjectById: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },

  createProject: async (data: {
    name: string;
    description?: string;
    status: string;
    project_type?: string;
    start_date?: string;
    end_date?: string;
    manager_id?: string;
  }) => {
    const response = await api.post('/projects/', data);
    return response.data;
  },

  updateProject: async (
    projectId: string,
    data: { name?: string; description?: string; status?: string; project_type?: string; manager_id?: string; end_date?: string }
  ) => {
    const response = await api.patch(`/projects/${projectId}`, data);
    return response.data;
  },

  addMember: async (projectId: string, userId: string) => {
    const response = await api.post(`/projects/${projectId}/members`, { user_id: userId });
    return response.data;
  },

  getMembers: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/members`);
    return response.data;
  },

  bulkAddMembers: async (projectId: string, userIds: string[]) => {
    const response = await api.post(`/projects/${projectId}/members/bulk`, { user_ids: userIds });
    return response.data;
  },

  deleteProject: async (projectId: string) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },

  getProjectMessages: async (projectId: string) => {
    const response = await api.get(`/project-chat/${projectId}/messages`);
    return response.data;
  },

  uploadProjectChatFile: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/project-chat/${projectId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  sendProjectMessage: async (projectId: string, message: string) => {
    const response = await api.post(`/project-chat/${projectId}/messages`, { message });
    return response.data;
  },
};
