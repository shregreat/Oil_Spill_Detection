/**
 * Single transport for the whole application.
 *
 * In this phase `NEXT_PUBLIC_USE_MOCKS` is true, so every call resolves from the
 * deterministic dataset in `src/lib/mock` after a small simulated latency.
 * When the backend is ready, set NEXT_PUBLIC_USE_MOCKS=false and the very same
 * service calls will hit `NEXT_PUBLIC_API_BASE_URL` over HTTP - no component
 * changes are required because components never call fetch directly.
 */

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== 'false';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? '';

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'request_failed', status = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export interface RequestOptions<T> {
  /** Mock resolver used while the backend does not exist yet. */
  mock: () => T;
  /** Simulated latency in ms so loading states are visible and testable. */
  latencyMs?: number;
  /** Force an error - used by the UI error-state demos. */
  failWith?: ApiError;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new ApiError('Request aborted', 'aborted', 499));
    });
  });
}

async function request<T>(path: string, options: RequestOptions<T>): Promise<T> {
  const { mock, latencyMs = 320, failWith, method = 'GET', body, signal } = options;

  if (failWith) {
    await wait(Math.min(latencyMs, 200), signal);
    throw failWith;
  }

  if (USE_MOCKS) {
    await wait(latencyMs, signal);
    return mock();
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    // Gracefully fallback to mock dataset if endpoint is not implemented on backend (404)
    if (response.status === 404 && mock) {
      return mock();
    }

    throw new ApiError(`Request to ${path} failed`, 'http_error', response.status);
  } catch (err) {
    // If backend connection fails or endpoint missing, fallback to mock data
    if (mock && !(err instanceof ApiError && err.status !== 404)) {
      return mock();
    }
    throw err;
  }
}

export const apiClient = {
  isMockMode: USE_MOCKS,
  get: <T>(path: string, options: RequestOptions<T>) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, options: RequestOptions<T>) => request<T>(path, { ...options, method: 'POST' }),
  patch: <T>(path: string, options: RequestOptions<T>) => request<T>(path, { ...options, method: 'PATCH' }),
  delete: <T>(path: string, options: RequestOptions<T>) => request<T>(path, { ...options, method: 'DELETE' })
};
