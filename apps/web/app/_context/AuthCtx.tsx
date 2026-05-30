'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { API_URL } from '../_lib/apiFetch';

const TOKEN_KEY = 'auth_token';

interface AuthState {
  token: string | null;
  personId: number | null;
  name: string | null;
  email: string | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, personId: number, name: string, email: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthCtx = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    personId: null,
    name: null,
    email: null,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthState;
        setAuth(parsed);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setReady(true);
  }, []);

  const login = (token: string, personId: number, name: string, email: string) => {
    const state: AuthState = { token, personId, name, email };
    localStorage.setItem(TOKEN_KEY, JSON.stringify(state));
    setAuth(state);
  };

  const logout = () => {
    // Fire-and-forget the server announce — local state must clear even if
    // the API is down. apiFetch can't be used here because the server replies
    // 204 (no body) which apiFetch tries to .json().
    if (auth.token) {
      fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setAuth({ token: null, personId: null, name: null, email: null });
  };

  if (!ready) return null;

  return (
    <AuthCtx.Provider value={{ ...auth, login, logout, isAuthenticated: !!auth.token }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
