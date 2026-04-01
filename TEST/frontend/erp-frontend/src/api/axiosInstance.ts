import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ENV } from '../config/env';

const api = axios.create({
  baseURL: ENV.API_BASE_URL,
});

// Request Interceptor: Attach JWT from erp_token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('erp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Handle 401 and 403
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ detail?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_role');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      window.location.href = '/403';
    }
    return Promise.reject(error);
  }
);

export default api;
