import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface GitHubActivityItem {
  event_type: 'push' | 'pull_request';
  repo: string;
  title: string;
  timestamp: string;
  actor: string;
  actor_matched: boolean;
  pr_number?: number;
}

export const webhooksApi = {
  getGitHubActivity: async (): Promise<GitHubActivityItem[]> => {
    const response = await axios.get(`${API_URL}/webhooks/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  },
};
