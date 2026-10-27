import { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth.js';
import { CourseOverview } from '../types/curriculum.js';

import { apiUrl } from './apiUrl.js';

export const api = {
  getToken: () => localStorage.getItem('quikz_token'),
  setToken: (token: string) => localStorage.setItem('quikz_token', token),
  clearToken: () => localStorage.removeItem('quikz_token'),

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(apiUrl(`/api${endpoint}`), {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error([data.message || `Request failed with status ${res.status}`, ...(data.errors || [])].join('\n'));
    }

    return data as T;
  },

  // Auth
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(res.token);
    return res;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  },

  // Subjects
  async getCourseOverview(signal?: AbortSignal): Promise<{ courses: CourseOverview[] }> {
    return this.request('/subjects/overview', { signal });
  },
  async getSubjects(signal?: AbortSignal): Promise<{ subjects: any[] }> {
    return this.request<{ subjects: any[] }>('/subjects', { signal });
  },

  async createSubject(data: { name: string; code: string; term: string; yearLevel: string; description?: string }): Promise<{ subject: any }> {
    return this.request<{ subject: any }>('/subjects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Modules
  async getSubjectModules(subjectId: string): Promise<{ modules: any[]; progress?: any }> {
    return this.request<{ modules: any[]; progress?: any }>(`/subjects/${subjectId}/modules`);
  },

  async createModule(subjectId: string, formData: FormData): Promise<{ module: any }> {
    return this.request<{ module: any }>(`/subjects/${subjectId}/modules`, {
      method: 'POST',
      body: formData
    });
  },

  async completeModule(moduleId: string): Promise<{ message: string; unlockedNext: boolean }> {
    return this.request<{ message: string; unlockedNext: boolean }>(`/modules/${moduleId}/complete`, {
      method: 'POST'
    });
  }
};
