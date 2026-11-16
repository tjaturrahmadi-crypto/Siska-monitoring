import { DEFAULT_MASTER_SETTINGS } from '../constants/defaults';
import type {
  CalendarNote,
  CalendarNoteCategory,
  MasterSettings,
  OrderFormPayload,
  ProductionOrder,
  UserAccountStatus,
  UserProfile,
  UserRole,
} from '../types';
import { sanitizeOrderPayload } from '../utils/orderCalculations';

const TOKEN_STORAGE_KEY = 'siska_auth_token';

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { error: text };
    }
  }

  if (!res.ok) {
    const errMsg =
      typeof parsed.error === 'string' && parsed.error
        ? parsed.error
        : `Permintaan gagal (kode ${res.status}).`;
    const code = typeof parsed.code === 'string' ? parsed.code : undefined;
    throw new ApiError(errMsg, res.status, code);
  }

  return parsed as T;
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<UserProfile> {
  const data = await apiRequest<{ token: string; user: UserProfile }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setStoredToken(data.token);
  return data.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<UserProfile> {
  const data = await apiRequest<{ token: string; user: UserProfile }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  setStoredToken(data.token);
  return data.user;
}

export async function fetchCurrentUser(): Promise<UserProfile | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const data = await apiRequest<{ user: UserProfile }>('/api/auth/me');
    return data.user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      clearStoredToken();
      return null;
    }
    throw err;
  }
}

export function logoutUser(): void {
  clearStoredToken();
}

export async function fetchBootstrapData(): Promise<{
  user: UserProfile;
  settings: MasterSettings;
  orders: ProductionOrder[];
  calendarNotes: CalendarNote[];
  users: UserProfile[];
}> {
  const data = await apiRequest<{
    user: UserProfile;
    settings: Partial<MasterSettings>;
    orders: ProductionOrder[];
    calendarNotes: CalendarNote[];
    users: UserProfile[];
  }>('/api/bootstrap');

  return {
    user: data.user,
    settings: {
      ...DEFAULT_MASTER_SETTINGS,
      ...(data.settings || {}),
    },
    orders: Array.isArray(data.orders) ? data.orders : [],
    calendarNotes: Array.isArray(data.calendarNotes) ? data.calendarNotes : [],
    users: Array.isArray(data.users) ? data.users : [],
  };
}

export function subscribeRealtimeUpdates(handlers: {
  onOrders: (orders: ProductionOrder[]) => void;
  onOrderUpsert?: (order: ProductionOrder) => void;
  onOrderDelete?: (id: string) => void;
  onNotes: (notes: CalendarNote[]) => void;
  onSettings: (settings: MasterSettings) => void;
  onUsers: (users: UserProfile[]) => void;
  onSelfUser: (user: UserProfile) => void;
}): () => void {
  const token = getStoredToken();
  if (!token) return () => {};

  const source = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);

  source.addEventListener('orders', (ev) => {
    try {
      const payload = JSON.parse((ev as MessageEvent).data) as { orders?: ProductionOrder[] };
      if (Array.isArray(payload.orders)) handlers.onOrders(payload.orders);
    } catch {
      // Ignore malformed SSE payload
    }
  });

  source.addEventListener('order_upsert', (ev) => {
    try {
      const payload = JSON.parse((ev as MessageEvent).data) as { order?: ProductionOrder };
      if (payload.order && handlers.onOrderUpsert) handlers.onOrderUpsert(payload.order);
    } catch {
      // Ignore
    }
  });

  source.addEventListener('order_delete', (ev) => {
    try {
      const payload = JSON.parse((ev as MessageEvent).data) as { id?: string };
      if (payload.id && handlers.onOrderDelete) handlers.onOrderDelete(payload.id);
    } catch {
      // Ignore
    }
  });

  source.addEventListener('notes', (ev) => {
    try {
      const payload = JSON.parse((ev as MessageEvent).data) as { calendarNotes?: CalendarNote[] };
      if (Array.isArray(payload.calendarNotes)) handlers.onNotes(payload.calendarNotes);
    } catch {
      // Ignore
    }
  });

  source.addEventListener('settings', (ev) => {
    try {
      const payload = JSON.parse((ev as MessageEvent).data) as {
        settings?: Partial<MasterSettings>;
      };
      if (payload.settings) {
        handlers.onSettings({
          ...DEFAULT_MASTER_SETTINGS,
          ...payload.settings,
        });
      }
    } catch {
      // Ignore
    }
  });

  source.addEventListener('users', (ev) => {
    try {
      const payload = JSON.parse((ev as MessageEvent).data) as { users?: UserProfile[] };
      if (Array.isArray(payload.users)) handlers.onUsers(payload.users);
    } catch {
      // Ignore
    }
  });

  source.addEventListener('self_user', (ev) => {
    try {
      const payload = JSON.parse((ev as MessageEvent).data) as { user?: UserProfile };
      if (payload.user) handlers.onSelfUser(payload.user);
    } catch {
      // Ignore
    }
  });

  return () => {
    source.close();
  };
}

export async function createOrder(payload: OrderFormPayload): Promise<ProductionOrder> {
  const clean = sanitizeOrderPayload(payload);
  const data = await apiRequest<{ order: ProductionOrder }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(clean),
  });
  return data.order;
}

export async function updateOrderFields(
  orderId: string,
  updates: Partial<OrderFormPayload>
): Promise<ProductionOrder> {
  const data = await apiRequest<{ order: ProductionOrder }>(
    `/api/orders/${encodeURIComponent(orderId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }
  );
  return data.order;
}

export async function updateFullOrder(
  orderId: string,
  payload: OrderFormPayload
): Promise<ProductionOrder> {
  const clean = sanitizeOrderPayload(payload);
  const data = await apiRequest<{ order: ProductionOrder }>(
    `/api/orders/${encodeURIComponent(orderId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ ...clean, _fullUpdate: true }),
    }
  );
  return data.order;
}

export async function deleteOrder(orderId: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: 'DELETE',
  });
}

export async function seedSampleOrders(): Promise<ProductionOrder[]> {
  const data = await apiRequest<{ orders: ProductionOrder[] }>('/api/orders/seed', {
    method: 'POST',
  });
  return data.orders;
}

export async function saveMasterSettings(
  settings: Omit<MasterSettings, 'updatedAt'>
): Promise<MasterSettings> {
  const data = await apiRequest<{ settings: MasterSettings }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return {
    ...DEFAULT_MASTER_SETTINGS,
    ...data.settings,
  };
}

export async function createCalendarNote(input: {
  dateKey: string;
  title: string;
  content: string;
  category: CalendarNoteCategory;
  authorUid: string;
  authorName: string;
}): Promise<string> {
  const data = await apiRequest<{ id: string; note: CalendarNote }>('/api/calendar-notes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.id;
}

export async function updateCalendarNote(
  noteId: string,
  input: {
    dateKey: string;
    title: string;
    content: string;
    category: CalendarNoteCategory;
  }
): Promise<void> {
  await apiRequest<{ note: CalendarNote }>(`/api/calendar-notes/${encodeURIComponent(noteId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteCalendarNote(noteId: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/api/calendar-notes/${encodeURIComponent(noteId)}`, {
    method: 'DELETE',
  });
}

export async function updateUserAccess(
  uid: string,
  updates: { status?: UserAccountStatus; role?: UserRole }
): Promise<UserProfile> {
  const data = await apiRequest<{ user: UserProfile }>(
    `/api/users/${encodeURIComponent(uid)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }
  );
  return data.user;
}

export async function downloadBackupJson(): Promise<void> {
  const token = getStoredToken();
  const res = await fetch('/api/backup', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error('Gagal mengunduh file backup JSON.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `siska-backup-${today}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importBackupJson(
  backup: unknown,
  mode: 'replace' | 'merge'
): Promise<{
  importedOrders: number;
  importedNotes: number;
  orders: ProductionOrder[];
  calendarNotes: CalendarNote[];
  settings: MasterSettings;
}> {
  return apiRequest('/api/backup/import', {
    method: 'POST',
    body: JSON.stringify({ backup, mode }),
  });
}
