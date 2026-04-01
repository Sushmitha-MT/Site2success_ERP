import api from './axiosInstance';

export const sprintsApi = {
  getSprints: async () => {
    const response = await api.get('/sprints/');
    return response.data;
  },

  createSprint: async (data: { project_id: string; name: string; start_date?: string; end_date?: string }) => {
    const response = await api.post('/sprints/', data);
    return response.data;
  },

  activateSprint: async (sprintId: string) => {
    const response = await api.patch(`/sprints/${sprintId}/activate`);
    return response.data;
  }
};
