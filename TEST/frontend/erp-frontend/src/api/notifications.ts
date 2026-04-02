import api from './axiosInstance';

export interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  getNotifications: async (): Promise<Notification[]> => {
    const response = await api.get('/notifications/');
    return response.data;
  },

  markAsRead: async (notificationId: string): Promise<{status: string, message: string}> => {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  deleteNotification: async (notificationId: string): Promise<{status: string, message: string}> => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
};
