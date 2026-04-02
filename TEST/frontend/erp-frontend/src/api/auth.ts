import api from './axiosInstance';

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'project_manager' | 'employee' | 'founder' | 'co_founder' | 'admin' | 'manager';
  is_active: boolean;
  department: string | null;
  designation: string | null;
  join_date: string | null;
  phone: string | null;
  address: string | null;
  theme: string | null;
  workspace_enabled: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Document {
  id: string;
  user_id: string;
  name: string;
  url: string;
  uploaded_at: string;
}

// ── Auth functions ────────────────────────────────────────────────────────────

/**
 * GET /users — returns minimal user objects for assignment
 */
export async function getAllUsers(): Promise<Partial<User>[]> {
  const res = await api.get<Partial<User>[]>('/users');
  return res.data;
}

/**
 * GET /users/me — returns full user object matching Alen's schema.
 */
export async function getMe(): Promise<User> {
  const res = await api.get<User>('/users/me');
  return res.data;
}

/**
 * POST /auth/login — stores erp_token + erp_role, returns full user object.
 */
export async function login(email: string, password: string): Promise<User> {
  const res = await api.post<{ access_token: string; token_type: string }>(
    '/auth/login',
    { email, password }
  );
  const { access_token } = res.data;

  localStorage.setItem('erp_token', access_token);

  const user = await getMe();
  localStorage.setItem('erp_role', user.role);

  return user;
}

/**
 * Clear tokens, redirect to /login.
 */
export function logout(): void {
  localStorage.removeItem('erp_token');
  localStorage.removeItem('erp_role');
  window.location.href = '/login';
}

// ── Profile & Preferences ─────────────────────────────────────────────────────

export async function updateProfile(data: {
  department?: string;
  designation?: string;
  phone?: string;
  address?: string;
}): Promise<User> {
  const res = await api.patch<User>('/users/me/profile', data);
  return res.data;
}

export async function updatePreferences(data: {
  theme?: string;
  workspace_enabled?: boolean;
}): Promise<User> {
  const res = await api.patch<User>('/users/me/preferences', data);
  return res.data;
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function getDocuments(): Promise<Document[]> {
  const res = await api.get<Document[]>('/users/me/documents');
  return res.data;
}

export async function addDocument(data: { name: string; url: string }): Promise<Document> {
  const res = await api.post<Document>('/users/me/documents', data);
  return res.data;
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/users/me/documents/${id}`);
}
