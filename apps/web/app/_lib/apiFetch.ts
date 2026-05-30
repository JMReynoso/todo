export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5091';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
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

  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}
