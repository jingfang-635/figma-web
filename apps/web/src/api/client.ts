export interface ApiListResponse<T = Record<string, unknown>> {
  data: T[];
  total?: number;
}

export interface ApiError {
  message: string;
}

const TOKEN_KEY = 'sunshine_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    localStorage.removeItem('sunshine_user');
    // Avoid hard redirect loop on login page; let React Router handle auth
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login');
    }
    throw new Error('未授权，请重新登录');
  }

  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    try {
      const body = (await response.json()) as ApiError;
      if (body.message) message = body.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete(path: string): Promise<void> {
    return request<void>(path, { method: 'DELETE' });
  },
};

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface DashboardStats {
  users: number;
  patients: number;
  doctors: number;
  departments: number;
  appointments: number;
  pendingAppointments: number;
  todayAppointments: number;
  orders: number;
  reviews: number;
  unreadNotifications: number;
  pendingFeedback: number;
  totalPatients: number;
  todayNew: number;
  monthAppointments: number;
  blacklist: number;
  todayOrders: number;
  todayIncome: number;
  pendingRefunds: number;
  monthIncome: number;
}

interface BackendLoginResponse {
  access_token?: string;
  token?: string;
  user: LoginResponse['user'];
}

interface BackendDashboardStats {
  users?: number;
  patients?: number;
  doctors?: number;
  departments?: number;
  appointments?: number;
  pendingAppointments?: number;
  todayAppointments?: number;
  orders?: number;
  reviews?: number;
  unreadNotifications?: number;
  pendingFeedback?: number;
  totalPatients?: number;
  todayNew?: number;
  monthAppointments?: number;
  blacklist?: number;
  todayOrders?: number;
  todayIncome?: number;
  pendingRefunds?: number;
  monthIncome?: number;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const raw = await api.post<BackendLoginResponse>('/api/auth/login', { email, password });
  const token = raw.access_token ?? raw.token;
  if (!token) {
    throw new Error('登录成功但未返回令牌');
  }
  return { token, user: raw.user };
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const raw = await api.get<BackendDashboardStats>('/api/dashboard/stats');
  return {
    users: raw.users ?? 0,
    patients: raw.patients ?? 0,
    doctors: raw.doctors ?? 0,
    departments: raw.departments ?? 0,
    appointments: raw.appointments ?? 0,
    pendingAppointments: raw.pendingAppointments ?? 0,
    todayAppointments: raw.todayAppointments ?? 0,
    orders: raw.orders ?? 0,
    reviews: raw.reviews ?? 0,
    unreadNotifications: raw.unreadNotifications ?? 0,
    pendingFeedback: raw.pendingFeedback ?? 0,
    totalPatients: raw.totalPatients ?? raw.patients ?? 0,
    todayNew: raw.todayNew ?? 0,
    monthAppointments: raw.monthAppointments ?? 0,
    blacklist: raw.blacklist ?? 0,
    todayOrders: raw.todayOrders ?? 0,
    todayIncome: raw.todayIncome ?? 0,
    pendingRefunds: raw.pendingRefunds ?? 0,
    monthIncome: raw.monthIncome ?? 0,
  };
}

export async function fetchResourceList<T = Record<string, unknown>>(
  resource: string,
  search?: string,
): Promise<ApiListResponse<T>> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const query = params.toString();
  const path = `/api/${resource}${query ? `?${query}` : ''}`;
  const raw = await api.get<T[] | ApiListResponse<T>>(path);
  if (Array.isArray(raw)) {
    return { data: raw, total: raw.length };
  }
  return {
    data: raw.data ?? [],
    total: raw.total ?? raw.data?.length ?? 0,
  };
}

export async function createResource<T = Record<string, unknown>>(
  resource: string,
  data: Record<string, unknown>,
): Promise<T> {
  return api.post<T>(`/api/${resource}`, data);
}

export async function updateResource<T = Record<string, unknown>>(
  resource: string,
  id: string | number,
  data: Record<string, unknown>,
): Promise<T> {
  return api.put<T>(`/api/${resource}/${id}`, data);
}

export async function deleteResource(
  resource: string,
  id: string | number,
): Promise<void> {
  return api.delete(`/api/${resource}/${id}`);
}
