import api from './axiosInstance';

export const tasksApi = {
  getTasks: async (projectId?: string) => {
    const url = projectId ? `/tasks/?project_id=${projectId}` : '/tasks/';
    const response = await api.get(url);
    return response.data;
  },

  createTask: async (data: {
    project_id: string;
    sprint_id?: string;
    parent_task_id?: string;
    title: string;
    description?: string;
    assignee_id?: string;
    status: string;
    priority: string;
    order_index: number;
    due_date?: string;
  }) => {
    const response = await api.post('/tasks/', data);
    return response.data;
  },

  updateTask: async (
    taskId: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      order_index?: number;
      assignee_id?: string;
      due_date?: string;
    }
  ) => {
    const response = await api.patch(`/tasks/${taskId}`, data);
    return response.data;
  },

  deleteTask: async (taskId: string) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },

  getComments: async (taskId: string) => {
    const response = await api.get(`/tasks/${taskId}/comments`);
    return response.data;
  },

  addComment: async (taskId: string, text: string) => {
    const response = await api.post(`/tasks/${taskId}/comments`, { text });
    return response.data;
  },
};
