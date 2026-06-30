import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { toast } from '@/components/ui/use-toast';
export type { PaginatedResult, ApiResponse } from '@shared/types/api';

type RequestConfig = AxiosRequestConfig & { _suppressGlobalToast?: boolean };

// ─── Axios Instance ─────────────────────────────────────────────────────────

const API_BASE_URL = '/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: Inject Bearer Token ───────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Global Error Handling with Toast ─────────────────

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ message?: string; code?: string }>) => {
    if (typeof window === 'undefined') {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const data = error.response?.data;
    const errorCode = data?.code;

    // 401: Clear auth state and redirect to login
    if (status === 401) {
      localStorage.removeItem('token');
      document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Skip toast for validation errors — these are handled inline by forms
    if (errorCode === 'VALIDATION_ERROR') {
      return Promise.reject(error);
    }

    // Skip toast for business rule errors that pages handle specifically
    // (e.g., HAS_ACTIVE_TICKETS, UNRATED_TICKETS_EXIST, CONFLICT)
    const silentCodes = ['HAS_ACTIVE_TICKETS', 'UNRATED_TICKETS_EXIST', 'CONFLICT'];
    if (errorCode && silentCodes.includes(errorCode)) {
      return Promise.reject(error);
    }

    // Skip toast if the request was marked to suppress global error handling
    // Pages can set config._suppressGlobalToast = true for custom handling
    const config = error.config as InternalAxiosRequestConfig & { _suppressGlobalToast?: boolean };
    if (config?._suppressGlobalToast) {
      return Promise.reject(error);
    }

    // Show toast for all other API errors (500, 403, 404, etc.)
    if (status && status >= 400) {
      const message = data?.message || getDefaultErrorMessage(status);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    }

    // Network errors (no response)
    if (!error.response && error.message) {
      toast({
        variant: 'destructive',
        title: 'Koneksi Gagal',
        description: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
      });
    }

    return Promise.reject(error);
  }
);

/**
 * Get a user-friendly default error message based on HTTP status code.
 */
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 403:
      return 'Anda tidak memiliki akses untuk melakukan tindakan ini.';
    case 404:
      return 'Data yang diminta tidak ditemukan.';
    case 409:
      return 'Terjadi konflik data. Silakan coba lagi.';
    case 429:
      return 'Terlalu banyak permintaan. Silakan tunggu beberapa saat.';
    case 500:
      return 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
    default:
      return 'Terjadi kesalahan. Silakan coba lagi.';
  }
}

export default api;

// ─── Toast Helpers ──────────────────────────────────────────────────────────

/**
 * Show a success toast notification. Use after successful API operations.
 */
export function showSuccessToast(title: string, description?: string) {
  toast({
    title,
    description,
  });
}

/**
 * Show an error toast notification. Use for custom error messages.
 * Note: Most API errors are already handled globally by the interceptor.
 */
export function showErrorToast(title: string, description?: string) {
  toast({
    variant: 'destructive',
    title,
    description,
  });
}

// ─── Types ──────────────────────────────────────────────────────────────────

// ApiResponse is re-exported from @poldahelp/shared above

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nama: string;
  email: string;
  nomorWhatsApp: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface CreateTicketPayload {
  judul: string;
  deskripsi: string;
  kategori: string;
  lokasi: string;
}

export interface AssignTicketPayload {
  padalId: string;
}

export interface CancelTicketPayload {
  alasanBatal?: string;
}

export interface RejectTicketPayload {
  alasanTolak: string;
}

export interface RatingPayload {
  bintang: number;
  feedback: string;
}

export interface ChangeRolePayload {
  role: string;
}

export interface AddTeknisiPayload {
  teknisiId: string;
}

export interface UpdateProfilePayload {
  nama?: string;
  nomorWhatsApp?: string;
  divisi?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateSettingsPayload {
  appName: string;
}

export interface ReportParams {
  month: number;
  year: number;
}

// ─── Auth API ───────────────────────────────────────────────────────────────

export const authApi = {
  login: (data: LoginPayload) =>
    api.post('/auth/login', data),

  register: (data: RegisterPayload) =>
    api.post('/auth/register', data),

  forgotPassword: (data: ForgotPasswordPayload) =>
    api.post('/auth/forgot-password', data),

  resetPassword: (data: ResetPasswordPayload) =>
    api.post('/auth/reset-password', data),
};

// ─── Ticket API ─────────────────────────────────────────────────────────────

export const ticketApi = {
  create: (data: FormData) =>
    api.post('/tickets', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  list: (params?: Record<string, string | number>) =>
    api.get('/tickets', { params }),

  getById: (id: string, config?: RequestConfig) =>
    api.get(`/tickets/${id}`, config),

  assign: (id: string, data: AssignTicketPayload) =>
    api.patch(`/tickets/${id}/assign`, data),

  complete: (id: string) =>
    api.patch(`/tickets/${id}/complete`),

  cancel: (id: string, data: CancelTicketPayload) =>
    api.patch(`/tickets/${id}/cancel`, data),

  reject: (id: string, data: RejectTicketPayload) =>
    api.patch(`/tickets/${id}/reject`, data),

  downloadAttachment: (ticketId: string, fileId: string) =>
    api.get(`/tickets/${ticketId}/attachments/${fileId}`, {
      responseType: 'blob',
    }),
};

// ─── Rating API ─────────────────────────────────────────────────────────────

export const ratingApi = {
  submit: (ticketId: string, data: RatingPayload) =>
    api.post(`/tickets/${ticketId}/rating`, data),

  getByTicket: (ticketId: string) =>
    api.get(`/tickets/${ticketId}/rating`),
};

// ─── Notification API ───────────────────────────────────────────────────────

export const notificationApi = {
  list: (params?: { page?: number }) =>
    api.get('/notifications', { params }),

  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch('/notifications/read-all'),

  delete: (id: string) =>
    api.delete(`/notifications/${id}`),
};

// ─── Staff API ──────────────────────────────────────────────────────────────

export const staffApi = {
  listUsers: (params?: Record<string, string | number>) =>
    api.get('/staff/users', { params }),

  changeRole: (userId: string, data: ChangeRolePayload) =>
    api.patch(`/staff/users/${userId}/role`, data),

  resetPassword: (userId: string) =>
    api.post(`/staff/users/${userId}/reset-password`),

  softDelete: (userId: string, params?: { forceDelete?: boolean }) =>
    api.delete(`/staff/users/${userId}`, { params }),

  getTeams: () =>
    api.get('/staff/teams'),

  addTeknisi: (padalId: string, data: AddTeknisiPayload) =>
    api.post(`/staff/teams/${padalId}/members`, data),

  removeTeknisi: (padalId: string, teknisiId: string) =>
    api.delete(`/staff/teams/${padalId}/members/${teknisiId}`),

  getAvailableTeknisi: () =>
    api.get('/staff/available-teknisi'),
};

// ─── Report API ─────────────────────────────────────────────────────────────

export const reportApi = {
  getMonthly: (params: ReportParams) =>
    api.get('/reports/monthly', { params }),

  exportPDF: (params: ReportParams) =>
    api.get('/reports/monthly/pdf', {
      params,
      responseType: 'blob',
    }),

  exportExcel: (params: ReportParams) =>
    api.get('/reports/monthly/excel', {
      params,
      responseType: 'blob',
    }),
};

// ─── Profile API ────────────────────────────────────────────────────────────

export const profileApi = {
  get: () =>
    api.get('/profile'),

  update: (data: UpdateProfilePayload) =>
    api.patch('/profile', data),

  changePassword: (data: ChangePasswordPayload) =>
    api.patch('/profile/password', data),

  uploadPhoto: (data: FormData) =>
    api.post('/profile/photo', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ─── Dashboard API ──────────────────────────────────────────────────────────

export const dashboardApi = {
  getSatker: () =>
    api.get('/dashboard/satker'),

  getBidtekkom: () =>
    api.get('/dashboard/bidtekkom'),

  getPadal: () =>
    api.get('/dashboard/padal'),

  getTeknisi: () =>
    api.get('/dashboard/teknisi'),
};

// ─── Settings API ───────────────────────────────────────────────────────────

export const settingsApi = {
  get: () =>
    api.get('/settings'),

  update: (data: UpdateSettingsPayload) =>
    api.patch('/settings', data),

  uploadLogo: (data: FormData) =>
    api.post('/settings/logo', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ─── Audit API ──────────────────────────────────────────────────────────────

export const auditApi = {
  list: (params?: Record<string, string | number>) =>
    api.get('/audit', { params }),
};

