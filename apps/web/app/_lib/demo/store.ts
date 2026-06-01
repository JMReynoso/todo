import type { ScoringSettings } from '../../_types';
import { seed } from '../../_data/seed';
import { DEMO_PERSON } from './config';

/**
 * In-browser mock of the backend API used by the demo build. Persists to
 * localStorage so a visitor's edits survive reloads, and reseeds itself from
 * the shared demo data the first time (or whenever storage is cleared). The
 * response shapes mirror the real API DTOs so {@link demoFetch} is a drop-in
 * for the production `apiFetch` (see ../apiFetch).
 */

// ── API DTO shapes (mirror the ones consumed in Shell.tsx) ───────────────────
interface ApiSubtask {
  id: number;
  title: string;
  done: boolean;
  todoId: number;
}

interface ApiPerson {
  id: number;
  name: string;
  initials: string;
  color: string;
  email: string;
  photoUrl: string | null;
  scoring: ScoringSettings;
}

interface ApiTodo {
  id: number;
  title: string;
  cadence: string;
  done: boolean;
  priority: string;
  startsOn: string;
  dueOn: string | null;
  notes: string;
  streak: number;
  tags: string[];
  subtasks: ApiSubtask[];
  assignee: { id: number } | null;
}

interface DemoState {
  todos: ApiTodo[];
  persons: ApiPerson[];
  seq: number;
}

const STORAGE_KEY = 'demo_state_v1';

const DEFAULT_SCORING: ScoringSettings = {
  includeDaily: true,
  includeWeekly: true,
  includeMonthly: false,
  includeQuarterly: false,
  includeOnce: false,
  streakThreshold: 3,
};

function initials(name: string): string {
  return (name.trim().slice(0, 2) || 'D').toUpperCase();
}

/** Builds the first-run dataset from the shared demo seed. */
export function buildInitialState(): DemoState {
  let seq = 1;
  const todos: ApiTodo[] = seed().map((t) => {
    const id = seq++;
    return {
      id,
      title: t.title,
      cadence: t.cadence,
      done: t.done,
      priority: t.priority,
      startsOn: t.startsOn,
      dueOn: t.dueOn ?? null,
      notes: t.notes,
      streak: t.streak,
      tags: [...t.tags],
      subtasks: t.subtasks.map((s) => ({
        id: seq++,
        title: s.title,
        done: s.done,
        todoId: id,
      })),
      assignee: t.assignee != null ? { id: t.assignee } : null,
    };
  });

  const persons: ApiPerson[] = [
    {
      id: DEMO_PERSON.id,
      name: DEMO_PERSON.name,
      initials: initials(DEMO_PERSON.name),
      color: '#c97a3c',
      email: DEMO_PERSON.email,
      photoUrl: null,
      scoring: { ...DEFAULT_SCORING },
    },
    {
      id: seq++,
      name: 'Sam Rivera',
      initials: 'SR',
      color: '#4a76b8',
      email: 'sam@todo.app',
      photoUrl: null,
      scoring: { ...DEFAULT_SCORING },
    },
  ];

  return { todos, persons, seq };
}

function loadState(): DemoState {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as DemoState;
      } catch {
        // Corrupt payload — fall through and reseed.
      }
    }
  }
  const fresh = buildInitialState();
  saveState(fresh);
  return fresh;
}

function saveState(state: DemoState): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

/** Test seam: wipe persisted demo data so the next call reseeds. */
export function resetDemoState(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
}

function findTodo(state: DemoState, id: number): ApiTodo | undefined {
  return state.todos.find((t) => t.id === id);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** A simple, deterministic "score": completed tasks weighted by streak. */
function computeScore(state: DemoState): number {
  return state.todos
    .filter((t) => t.done)
    .reduce((sum, t) => sum + 10 + t.streak, 0);
}

/**
 * Routes an API call to the in-memory store. Mirrors the subset of endpoints
 * the client actually uses; unknown routes throw, which surfaces during
 * development if a new endpoint is added without demo support.
 */
export async function demoFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method ?? 'GET').toUpperCase();
  const state = loadState();
  const body = (): Record<string, unknown> =>
    typeof options?.body === 'string' ? JSON.parse(options.body) : {};

  let m: RegExpMatchArray | null;

  // ── Todos ──────────────────────────────────────────────────────────────
  if (path === '/api/todos') {
    if (method === 'GET') return state.todos as T;
    if (method === 'POST') {
      const b = body();
      const id = state.seq++;
      const todo: ApiTodo = {
        id,
        title: String(b.title ?? 'Untitled'),
        cadence: String(b.cadence ?? 'once'),
        done: false,
        priority: String(b.priority ?? 'med'),
        startsOn: String(b.startsOn ?? ''),
        dueOn: (b.dueOn as string | null) ?? null,
        notes: String(b.notes ?? ''),
        streak: 0,
        tags: (b.tags as string[]) ?? [],
        subtasks: ((b.subtasks as string[]) ?? [])
          .filter((title) => title && title.trim())
          .map((title) => ({ id: state.seq++, title, done: false, todoId: id })),
        assignee: b.assigneeId != null ? { id: Number(b.assigneeId) } : null,
      };
      state.todos.push(todo);
      saveState(state);
      return todo as T;
    }
  }

  if ((m = path.match(/^\/api\/todos\/(\d+)$/))) {
    const todo = findTodo(state, Number(m[1]));
    if (!todo) throw new Error(`demo: todo ${m[1]} not found`);
    if (method === 'PUT') {
      const b = body();
      todo.title = String(b.title ?? todo.title);
      todo.priority = String(b.priority ?? todo.priority);
      todo.startsOn = String(b.startsOn ?? todo.startsOn);
      todo.dueOn = (b.dueOn as string | null) ?? null;
      todo.notes = String(b.notes ?? '');
      todo.done = Boolean(b.done);
      todo.tags = (b.tags as string[]) ?? [];
      todo.assignee = b.assigneeId != null ? { id: Number(b.assigneeId) } : null;
      saveState(state);
      return todo as T;
    }
    if (method === 'DELETE') {
      state.todos = state.todos.filter((t) => t.id !== todo.id);
      saveState(state);
      return undefined as T;
    }
  }

  if ((m = path.match(/^\/api\/todos\/(\d+)\/subtasks$/)) && method === 'POST') {
    const todo = findTodo(state, Number(m[1]));
    if (!todo) throw new Error(`demo: todo ${m[1]} not found`);
    todo.subtasks.push({
      id: state.seq++,
      title: String(body().title ?? ''),
      done: false,
      todoId: todo.id,
    });
    saveState(state);
    return todo as T;
  }

  if ((m = path.match(/^\/api\/todos\/(\d+)\/subtasks\/(\d+)$/))) {
    const todo = findTodo(state, Number(m[1]));
    const sub = todo?.subtasks.find((s) => s.id === Number(m![2]));
    if (!todo || !sub) throw new Error(`demo: subtask ${m[2]} not found`);
    if (method === 'PATCH') {
      sub.done = Boolean(body().done);
      saveState(state);
      return todo as T;
    }
    if (method === 'DELETE') {
      todo.subtasks = todo.subtasks.filter((s) => s.id !== sub.id);
      saveState(state);
      return undefined as T;
    }
  }

  // ── Persons ────────────────────────────────────────────────────────────
  if (path === '/api/persons' && method === 'GET') return state.persons as T;

  if ((m = path.match(/^\/api\/persons\/(\d+)$/)) && method === 'PUT') {
    const person = state.persons.find((p) => p.id === Number(m![1]));
    if (!person) throw new Error(`demo: person ${m[1]} not found`);
    const b = body();
    person.name = String(b.name ?? person.name);
    person.initials = String(b.initials ?? initials(person.name));
    person.color = String(b.color ?? person.color);
    person.email = String(b.email ?? person.email);
    person.photoUrl = (b.photoUrl as string | null) ?? null;
    saveState(state);
    return person as T;
  }

  if ((m = path.match(/^\/api\/persons\/(\d+)\/scoring$/)) && method === 'PUT') {
    const person = state.persons.find((p) => p.id === Number(m![1]));
    if (!person) throw new Error(`demo: person ${m[1]} not found`);
    person.scoring = { ...person.scoring, ...(body() as Partial<ScoringSettings>) };
    saveState(state);
    return person as T;
  }

  if ((m = path.match(/^\/api\/persons\/(\d+)\/photo$/)) && method === 'POST') {
    const person = state.persons.find((p) => p.id === Number(m![1]));
    if (!person) throw new Error(`demo: person ${m[1]} not found`);
    const file = options?.body instanceof FormData ? options.body.get('file') : null;
    if (file instanceof File) person.photoUrl = await readFileAsDataUrl(file);
    saveState(state);
    return person as T;
  }

  // ── Scoring ────────────────────────────────────────────────────────────
  if ((m = path.match(/^\/api\/scoring\/(\d+)$/)) && method === 'GET') {
    const person = state.persons.find((p) => p.id === Number(m![1]));
    return {
      personId: Number(m[1]),
      name: person?.name ?? 'Demo User',
      score: computeScore(state),
    } as T;
  }

  throw new Error(`demoFetch: unhandled ${method} ${path}`);
}
