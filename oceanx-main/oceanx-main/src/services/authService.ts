import { apiClient, ApiError } from './apiClient';
import { SYSTEM_USERS } from '@/lib/mock/system';
import type { SystemUser } from '@/lib/types';

export interface Session {
  token: string;
  user: SystemUser;
  issuedAt: string;
}

const SESSION_KEY = 'oceanx.session';

/** Demo credentials shown on the login screen. */
export const DEMO_CREDENTIALS = { email: 'a.nair@oceanx.gov.in', password: 'oceanx-demo' };

export const authService = {
  login(email: string, password: string) {
    const user = SYSTEM_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    const valid = Boolean(user) && password.length >= 6;

    return apiClient.post<Session>('/auth/login', {
      latencyMs: 900,
      failWith: valid
        ? undefined
        : new ApiError('Invalid credentials. Use the demo account shown below.', 'invalid_credentials', 401),
      mock: () => ({
        token: 'demo-session-token',
        user: user!,
        issuedAt: new Date().toISOString()
      })
    });
  },

  persist(session: Session) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  current(): Session | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  },

  logout() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(SESSION_KEY);
  }
};
