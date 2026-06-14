export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:5091`
    : 'http://localhost:5091');

/**
 * Pull a human-readable message out of an error response body, which may be a
 * plain string, a JSON-encoded string, or an ASP.NET ProblemDetails object
 * ({ title, detail, errors }). Returns '' if nothing useful is found.
 */
function extractError(raw: string): string {
  if (!raw) return '';
  if (!raw.startsWith('{') && !raw.startsWith('"')) return raw; // plain text
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object') {
      const errors = parsed.errors as Record<string, string[]> | undefined;
      if (errors) {
        const flat = Object.values(errors).flat().filter(Boolean);
        if (flat.length) return flat.join(' ');
      }
      return parsed.detail || parsed.title || raw;
    }
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return raw;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Demo build: serve every request from the in-browser mock, no network.
  // The flag is a NEXT_PUBLIC_* var inlined at build time, so in production
  // this condition is frozen to `false` and the mock is never reached. The
  // import is dynamic so the mock loads only in the demo build.
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const { demoFetch } = await import('./demo/store');
    return demoFetch<T>(path, options);
  }

  const stored = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const token = stored ? (JSON.parse(stored) as { token: string }).token : null;

  // Let the browser set Content-Type (with boundary) for multipart uploads.
  const isFormData = options?.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  // A 401 means the token is missing, expired, or invalid. Tokens now carry an
  // expiry, so this is the normal end-of-session path: drop the stored token and
  // bounce to login instead of letting the app spin on a dead session.
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }

  if (!res.ok) {
    // Surface the server's message so callers can show why a request failed
    // instead of a bare status code. Bodies come in three shapes: a plain
    // string (BadRequest("…")), a JSON-encoded string, or a ProblemDetails
    // object (the [ApiController] auto-400 for model binding/validation).
    const raw = (await res.text().catch(() => '')).trim();
    throw new Error(extractError(raw) || `API ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}
