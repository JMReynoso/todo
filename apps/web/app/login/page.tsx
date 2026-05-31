'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../_context/AuthCtx';
import { API_URL } from '../_lib/apiFetch';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setError('Invalid email or password.');
        return;
      }

      const data = await res.json() as {
        token: string;
        personId: number;
        name: string;
        email: string;
      };

      login(data.token, data.personId, data.name, data.email);
      router.push('/');
    } catch {
      setError('Could not reach the server. Is the API running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          padding: '40px 36px',
          background: 'var(--bg-elev)',
          borderRadius: 16,
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--display)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--ink)',
              marginBottom: 4,
            }}
          >
            todo
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            sign in to continue
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              style={{
                fontSize: 14,
                color: 'var(--ink)',
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                outline: 0,
                width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                fontSize: 14,
                color: 'var(--ink)',
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                outline: 0,
                width: '100%',
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: 'var(--danger)', fontFamily: 'var(--mono)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '11px 0',
              borderRadius: 8,
              background: loading ? 'var(--accent-soft)' : 'var(--accent)',
              color: loading ? 'var(--accent-ink)' : '#fff',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 500,
              cursor: loading ? 'default' : 'pointer',
              transition: 'background 160ms ease',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
