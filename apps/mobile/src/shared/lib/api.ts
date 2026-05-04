import { tokenCache } from '@/shared/auth/token-cache';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function apiBaseUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (!base) {
    throw new ApiError(500, 'EXPO_PUBLIC_API_URL is not set');
  }
  return base.replace(/\/$/, '');
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : text || res.statusText;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; getToken: () => Promise<string | null> },
) {
  const token = await options.getToken();
  if (!token) {
    throw new ApiError(401, 'No session token');
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${apiBaseUrl()}/v1${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  return parseResponse<T>(res);
}

export async function getClerkTokenFromCache() {
  const sessionToken = await tokenCache.getToken('__session');
  return sessionToken ?? null;
}
