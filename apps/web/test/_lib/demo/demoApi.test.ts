import { beforeEach, describe, expect, it } from 'vitest';
import { demoFetch, resetDemoState } from '@/app/_lib/demo/store';

interface Todo {
  id: number;
  title: string;
  done: boolean;
  subtasks: { id: number; title: string; done: boolean }[];
  assignee: { id: number } | null;
}
interface Person { id: number; name: string; email: string; photoUrl: string | null; scoring: { includeMonthly: boolean } }

const post = (path: string, b: unknown) =>
  demoFetch<Todo>(path, { method: 'POST', body: JSON.stringify(b) });

describe('demoFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDemoState();
  });

  it('seeds and returns a non-empty todo list with numeric ids', async () => {
    const todos = await demoFetch<Todo[]>('/api/todos');
    expect(todos.length).toBeGreaterThan(0);
    expect(todos.every((t) => typeof t.id === 'number')).toBe(true);
  });

  it('creates a todo and drops blank subtask titles', async () => {
    const created = await post('/api/todos', {
      title: 'New', cadence: 'daily', priority: 'high', startsOn: '2026-06-01',
      tags: ['x'], subtasks: ['real', '  ', ''], assigneeId: 2,
    });
    expect(created.id).toBeTypeOf('number');
    expect(created.subtasks).toHaveLength(1);
    expect(created.assignee).toEqual({ id: 2 });

    const todos = await demoFetch<Todo[]>('/api/todos');
    expect(todos.some((t) => t.id === created.id)).toBe(true);
  });

  it('updates a todo via PUT', async () => {
    const created = await post('/api/todos', { title: 'A', cadence: 'once', startsOn: '2026-06-01' });
    const updated = await demoFetch<Todo>(`/api/todos/${created.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'B', priority: 'low', startsOn: '2026-06-02', notes: '', done: true, tags: [], assigneeId: null }),
    });
    expect(updated.title).toBe('B');
    expect(updated.done).toBe(true);
  });

  it('deletes a todo', async () => {
    const created = await post('/api/todos', { title: 'A', cadence: 'once', startsOn: '2026-06-01' });
    await demoFetch(`/api/todos/${created.id}`, { method: 'DELETE' });
    const todos = await demoFetch<Todo[]>('/api/todos');
    expect(todos.some((t) => t.id === created.id)).toBe(false);
  });

  it('adds, toggles, and removes a subtask', async () => {
    const created = await post('/api/todos', { title: 'A', cadence: 'once', startsOn: '2026-06-01' });
    const withSub = await post(`/api/todos/${created.id}/subtasks`, { title: 'sub' });
    const sub = withSub.subtasks.at(-1)!;
    expect(sub.title).toBe('sub');

    const toggled = await demoFetch<Todo>(`/api/todos/${created.id}/subtasks/${sub.id}`, {
      method: 'PATCH', body: JSON.stringify({ done: true }),
    });
    expect(toggled.subtasks.find((s) => s.id === sub.id)!.done).toBe(true);

    await demoFetch(`/api/todos/${created.id}/subtasks/${sub.id}`, { method: 'DELETE' });
    const after = await demoFetch<Todo[]>('/api/todos');
    expect(after.find((t) => t.id === created.id)!.subtasks.some((s) => s.id === sub.id)).toBe(false);
  });

  it('returns the demo person and updates profile + scoring', async () => {
    const people = await demoFetch<Person[]>('/api/persons');
    expect(people[0].id).toBe(1);

    const updated = await demoFetch<Person>('/api/persons/1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Renamed', color: '#000', email: 'r@x.com', photoUrl: null }),
    });
    expect(updated.name).toBe('Renamed');

    const scored = await demoFetch<Person>('/api/persons/1/scoring', {
      method: 'PUT', body: JSON.stringify({ includeMonthly: true }),
    });
    expect(scored.scoring.includeMonthly).toBe(true);
  });

  it('stores an uploaded photo as a data URL', async () => {
    const form = new FormData();
    form.append('file', new File(['hi'], 'a.png', { type: 'image/png' }));
    const person = await demoFetch<Person>('/api/persons/1/photo', { method: 'POST', body: form });
    expect(person.photoUrl).toMatch(/^data:/);
  });

  it('returns a score for a person', async () => {
    const score = await demoFetch<{ personId: number; name: string; score: number }>('/api/scoring/1');
    expect(score.personId).toBe(1);
    expect(score.score).toBeGreaterThanOrEqual(0);
  });

  it('persists changes across calls (localStorage-backed)', async () => {
    const created = await post('/api/todos', { title: 'persisted', cadence: 'once', startsOn: '2026-06-01' });
    // A fresh demoFetch call reloads from storage rather than memory.
    const todos = await demoFetch<Todo[]>('/api/todos');
    expect(todos.find((t) => t.id === created.id)?.title).toBe('persisted');
  });

  it('throws on an unhandled route', async () => {
    await expect(demoFetch('/api/unknown')).rejects.toThrow(/unhandled/);
  });
});
