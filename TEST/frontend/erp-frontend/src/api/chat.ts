import api from './axiosInstance';
import { ENV } from '../config/env';

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  message: string | null;
  file_url: string | null;
  file_type: 'image' | 'video' | 'document' | null;
  file_name: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface UploadResult {
  file_url: string;
  file_type: 'image' | 'video' | 'document';
  file_name: string;
}

/** Fetch last N messages from the REST API */
export async function fetchMessages(limit = 100): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatMessage[]>('/chat/messages', { params: { limit } });
  return data;
}

/** Edit a message */
export async function updateMessage(id: string, message: string): Promise<void> {
  await api.put(`/chat/messages/${id}`, { message });
}

/** Delete a message */
export async function deleteMessage(id: string): Promise<void> {
  await api.delete(`/chat/messages/${id}`);
}

/** Upload a file and return the URL + type */
export async function uploadChatFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<UploadResult>('/chat/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/** Build WebSocket URL from the REST base URL */
export function buildWsUrl(): string {
  let basePrefix = ENV.API_BASE_URL;
  if (!basePrefix.startsWith('http')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    basePrefix = `${protocol}//${window.location.host}${basePrefix}`;
  } else {
    basePrefix = basePrefix.replace(/^http/, 'ws');
  }
  return `${basePrefix}/chat/ws`;
}

/** Absolute URL for serving a chat file */
export function chatFileUrl(relativePath: string): string {
  // If API_BASE_URL is relative, we use it as is
  return `${ENV.API_BASE_URL}${relativePath}`;
}
