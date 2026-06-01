import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/app/_lib/apiFetch';

function mockResponse(opts: {
  ok: boolean;
  status?: number;
  json?: unknown;
  text?: string;
}): Response {
  return {
    ok: opts.ok,
    status: opts.status ?? (opts.ok ? 200 : 400),
    json: async () => opts.json,
    text: async () => opts.text ?? '',
  } as unknown as Response;
}

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the parsed JSON body on success', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockResponse({ ok: true, json: { hello: 'world' } }));

    const data = await apiFetch<{ hello: string }>('/things');
    expect(data).toEqual({ hello: 'world' });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('sets a JSON Content-Type by default', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockResponse({ ok: true, json: {} }));

    await apiFetch('/things', { method: 'POST', body: '{}' });
    const headers = fetchSpy.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('omits Content-Type for FormData bodies', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockResponse({ ok: true, json: {} }));

    await apiFetch('/upload', { method: 'POST', body: new FormData() });
    const headers = fetchSpy.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('attaches a bearer token when one is stored', async () => {
    localStorage.setItem('auth_token', JSON.stringify({ token: 'abc123' }));
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockResponse({ ok: true, json: {} }));

    await apiFetch('/secure');
    const headers = fetchSpy.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer abc123');
  });

  it('does not attach Authorization when no token is stored', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockResponse({ ok: true, json: {} }));

    await apiFetch('/public');
    const headers = fetchSpy.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('surfaces a plain-text error body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ ok: false, status: 400, text: 'Bad thing happened' }),
    );
    await expect(apiFetch('/x')).rejects.toThrow('Bad thing happened');
  });

  it('surfaces a JSON-encoded string error body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ ok: false, status: 400, text: '"Quoted message"' }),
    );
    await expect(apiFetch('/x')).rejects.toThrow('Quoted message');
  });

  it('flattens ProblemDetails validation errors', async () => {
    const body = JSON.stringify({
      title: 'Validation failed',
      errors: { Title: ['Title is required'], Name: ['Name is required'] },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ ok: false, status: 400, text: body }),
    );
    await expect(apiFetch('/x')).rejects.toThrow(/Title is required Name is required/);
  });

  it('falls back to detail or title for ProblemDetails without errors', async () => {
    const body = JSON.stringify({ title: 'Conflict', detail: 'Already exists' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ ok: false, status: 409, text: body }),
    );
    await expect(apiFetch('/x')).rejects.toThrow('Already exists');
  });

  it('falls back to a status message when the body is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ ok: false, status: 500, text: '' }),
    );
    await expect(apiFetch('/boom')).rejects.toThrow('API 500: /boom');
  });
});
