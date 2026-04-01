import api from './axiosInstance';

export const financeApi = {
  getFinanceEntries: async (projectId?: string) => {
    const url = projectId ? `/finance/?project_id=${projectId}` : '/finance/';
    const response = await api.get(url);
    return response.data;
  },

  createFinanceEntry: async (data: {
    amount: number;
    type: string;
    description: string;
    project_id?: string | null;
    date?: string;
    is_client_advance?: boolean;
    client_name?: string | null;
    advance_amount?: number | null;
  }) => {
    const response = await api.post('/finance/', data);
    return response.data;
  },

  deleteFinanceEntry: async (entryId: string) => {
    const response = await api.delete(`/finance/${entryId}`);
    return response.data;
  },
  downloadFinanceReport: async () => {
    const response = await api.get('/finance/download', {
      responseType: 'blob',
    });
    return response.data;
  },
  updateFinanceEntry: async (id: string, data: any) => {
    const response = await api.patch(`/finance/${id}`, data);
    return response.data;
  },
};
