'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../_context/AuthCtx';
import { DetailSheet } from './detail/DetailSheet';
import { SettingsModal } from './settings/SettingsModal';
import {
  TweakColor,
  TweakRadio,
  TweakToggle,
  TweaksPanel,
  useTweaks,
} from './tweaks-panel';
import { TopBar } from './views/TopBar';
import { MobileCtx } from '../_context/MobileCtx';
import { SettingsCtx } from '../_context/SettingsCtx';
import { TodoCtx, type TodoContextValue } from '../_context/TodoCtx';
import { ACCENTS } from '../_data/constants';
import { seed } from '../_data/seed';
import { useIsMobile } from '../_hooks/useIsMobile';
import { apiFetch } from '../_lib/apiFetch';
import { isoDate, nextDueOn } from '../_lib/dates';
import { uid } from '../_lib/uid';
import type {
  Cadence,
  Layout,
  Person,
  ProfileSettings,
  ScoringSettings,
  Settings,
  SettingsSection,
  Task,
  Tweaks,
} from '../_types';

interface ApiSubtask { id: number; title: string; done: boolean; todoId: number; }
interface ApiPersonResponse {
  id: number;
  name: string;
  initials: string;
  color: string;
  email: string;
  photoUrl: string | null;
  scoring: {
    includeDaily: boolean;
    includeWeekly: boolean;
    includeMonthly: boolean;
    includeQuarterly: boolean;
    includeOnce: boolean;
    streakThreshold: number;
  };
}
interface ApiTodo {
  id: number; title: string; cadence: string; done: boolean;
  priority: string; startsOn: string; dueOn: string | null;
  notes: string; streak: number; tags: string[]; subtasks: ApiSubtask[];
  assignee: Pick<ApiPersonResponse, 'id'> | null;
}

const mapApiPerson = (p: ApiPersonResponse): Person => ({
  id: p.id,
  name: p.name,
  initials: p.initials,
  color: p.color,
  photo: p.photoUrl,
});

const mapApiTodo = (t: ApiTodo): Task => ({
  id: String(t.id),
  title: t.title,
  cadence: t.cadence.toLowerCase() as Task['cadence'],
  done: t.done,
  priority: t.priority.toLowerCase() as Task['priority'],
  startsOn: t.startsOn,
  dueOn: t.dueOn ?? undefined,
  notes: t.notes,
  streak: t.streak,
  tags: t.tags,
  subtasks: t.subtasks.map(s => ({ id: String(s.id), title: s.title, done: s.done, taskId: t.id })),
  assignee: t.assignee?.id ?? null,
});

const TWEAK_DEFAULTS: Tweaks = {
  layout: 'stacked',
  accent: '#c97a3c',
  density: 'comfortable',
  showHairlines: true,
};

const INITIAL_SETTINGS: Settings = {
  profile: { name: 'You', email: 'you@todo.app', color: '#c97a3c' },
  scoring: {
    includeDaily: true,
    includeWeekly: true,
    includeMonthly: false,
    includeQuarterly: false,
    includeOnce: false,
    streakThreshold: 3,
  },
};

/**
 * Owns all app-wide state and renders the persistent shell (top bar, modals,
 * tweaks panel) around each route's content. Mounted by the root layout, so
 * state persists when navigating between `/` and `/performance`.
 */
export function Shell({ children }: { children: ReactNode }) {
  // SSR-skip: seed data uses Math.random() ids and views render new Date(),
  // so the server-rendered HTML would diverge from the client on hydration.
  // We render `null` until after mount, then bring the app online.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only mount gate
    setMounted(true);
  }, []);

  const { isAuthenticated, personId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tasks, setTasks] = useState<Task[]>(seed);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Task | null>(null);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const [people, setPeople] = useState<Person[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (mounted && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [mounted, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiFetch<ApiTodo[]>('/api/todos')
      .then(data => setTasks(data.map(mapApiTodo)))
      .catch(() => {}); // keep seed data if API is unreachable
  }, [isAuthenticated]);

  const settingsRef = useRef<Settings>(INITIAL_SETTINGS);
  const profileSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoringSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSubtaskAdds = useRef(0);

  // Load all persons: full list goes into people context, current user's entry
  // seeds the settings state.
  useEffect(() => {
    if (!isAuthenticated || !personId) return;
    apiFetch<ApiPersonResponse[]>('/api/persons')
      .then((list) => {
        setPeople(list.map(mapApiPerson));
        const me = list.find((p) => p.id === personId);
        if (!me) return;
        const s: Settings = {
          profile: { name: me.name, email: me.email, color: me.color, photo: me.photoUrl },
          scoring: me.scoring,
        };
        settingsRef.current = s;
        setSettings(s);
      })
      .catch(() => {});
  }, [isAuthenticated, personId]);

  const patchSettings = <S extends SettingsSection>(
    section: S,
    patch: Partial<Settings[S]>,
  ) => {
    setSettings((s) => {
      const next = { ...s, [section]: { ...s[section], ...patch } };
      settingsRef.current = next;
      return next;
    });
    if (!personId) return;
    if (section === 'profile') {
      if (profileSaveRef.current) clearTimeout(profileSaveRef.current);
      profileSaveRef.current = setTimeout(() => {
        const p = settingsRef.current.profile as ProfileSettings;
        apiFetch(`/api/persons/${personId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: p.name,
            initials: (p.name || 'Y').trim().slice(0, 2).toUpperCase(),
            color: p.color,
            email: p.email,
            photoUrl: p.photo ?? null,
          }),
        }).catch(() => {});
      }, 600);
    } else {
      if (scoringSaveRef.current) clearTimeout(scoringSaveRef.current);
      scoringSaveRef.current = setTimeout(() => {
        const sc = settingsRef.current.scoring as ScoringSettings;
        apiFetch(`/api/persons/${personId}/scoring`, {
          method: 'PUT',
          body: JSON.stringify({
            includeDaily: sc.includeDaily,
            includeWeekly: sc.includeWeekly,
            includeMonthly: sc.includeMonthly,
            includeQuarterly: sc.includeQuarterly,
            includeOnce: sc.includeOnce,
            streakThreshold: sc.streakThreshold,
          }),
        }).catch(() => {});
      }, 600);
    }
  };

  // Apply accent CSS variables.
  useEffect(() => {
    const a = ACCENTS[tweaks.accent] || ACCENTS['#c97a3c'];
    const r = document.documentElement.style;
    r.setProperty('--accent', a.accent);
    r.setProperty('--accent-soft', a.soft);
    r.setProperty('--accent-ink', a.ink);
  }, [tweaks.accent]);

  // Apply density data attribute.
  useEffect(() => {
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks.density]);

  const openTask = useMemo<Task | null>(
    () => draft || tasks.find((x) => x.id === openId) || null,
    [draft, tasks, openId],
  );

  const updateTask = (id: string, patch: Partial<Task>) =>
    setTasks((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const buildTaskBody = (t: Task) => ({
    title: t.title || 'Untitled',
    cadence: t.cadence,
    priority: t.priority,
    startsOn: t.startsOn,
    // DueOn is derived and locked — always recompute so it stays in sync.
    dueOn: nextDueOn(t.startsOn, t.cadence),
    notes: t.notes,
    assigneeId: t.assignee ?? null,
    done: t.done,
    tags: t.tags,
  });

  const toggleTask = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const newDone = !t.done;
    updateTask(id, { done: newDone });
    const numId = Number(id);
    if (!isNaN(numId)) {
      apiFetch(`/api/todos/${numId}`, {
        method: 'PUT',
        body: JSON.stringify(buildTaskBody({ ...t, done: newDone })),
      }).catch(() => {});
    }
  };

  // Patch whichever task the detail modal is currently showing — draft or saved.
  // For saved tasks, debounces a PUT to the API (skipped for subtask-only patches,
  // which have their own endpoints).
  const patchOpen = (patch: Partial<Task>) => {
    if (draft) {
      setDraft((d) => (d ? { ...d, ...patch } : d));
      return;
    }
    if (!openTask) return;
    updateTask(openTask.id, patch);
    const numId = Number(openTask.id);
    if (isNaN(numId)) return;
    if ('subtasks' in patch && Object.keys(patch).length === 1) return;
    const merged = { ...openTask, ...patch };
    if (taskSaveRef.current) clearTimeout(taskSaveRef.current);
    taskSaveRef.current = setTimeout(() => {
      if (!merged.title.trim()) return;
      apiFetch(`/api/todos/${numId}`, {
        method: 'PUT',
        body: JSON.stringify(buildTaskBody(merged)),
      }).catch(() => {});
    }, 600);
  };
  const toggleOpen = () => {
    if (openTask) patchOpen({ done: !openTask.done });
  };

  const toggleSubtask = (subId: string) => {
    if (!openTask) return;
    const taskId = openTask.id;
    if (draft) {
      setDraft((d) =>
        d ? { ...d, subtasks: d.subtasks.map((s) => s.id === subId ? { ...s, done: !s.done } : s) } : d,
      );
      return;
    }
    const numTaskId = Number(taskId);
    const numSubId = Number(subId);
    if (isNaN(numTaskId) || isNaN(numSubId)) return;
    const sub = openTask.subtasks.find((s) => s.id === subId);
    if (!sub) return;
    setTasks((xs) =>
      xs.map((x) =>
        x.id === taskId
          ? { ...x, subtasks: x.subtasks.map((s) => s.id === subId ? { ...s, done: !s.done } : s) }
          : x,
      ),
    );
    apiFetch(`/api/todos/${numTaskId}/subtasks/${numSubId}`, {
      method: 'PATCH',
      body: JSON.stringify({ done: !sub.done }),
    }).catch(() => {});
  };

  const deleteSubtask = (subId: string) => {
    if (!openTask) return;
    const taskId = openTask.id;
    if (draft) {
      setDraft((d) => d ? { ...d, subtasks: d.subtasks.filter((s) => s.id !== subId) } : d);
      return;
    }
    const numTaskId = Number(taskId);
    const numSubId = Number(subId);
    if (isNaN(numTaskId) || isNaN(numSubId)) return;
    setTasks((xs) =>
      xs.map((x) =>
        x.id === taskId ? { ...x, subtasks: x.subtasks.filter((s) => s.id !== subId) } : x,
      ),
    );
    apiFetch(`/api/todos/${numTaskId}/subtasks/${numSubId}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  // Hover-+ creates a DRAFT (not yet committed). Modal "Save" commits it.
  const createOnDate = (date: Date) => {
    const iso = isoDate(date);
    setDraft({
      id: uid(),
      cadence: 'once',
      startsOn: iso,
      dueOn: nextDueOn(iso, 'once'),
      title: '',
      done: false,
      priority: 'med',
      tags: [],
      subtasks: [],
      notes: '',
      streak: 0,
      assignee: null,
      isDraft: true,
    });
  };
  // Click an "Add to ..." composer → spawn a draft for that cadence, anchored today.
  const createDraftFor = (cadence: Cadence) => {
    const iso = isoDate(new Date());
    setDraft({
      id: uid(),
      cadence,
      startsOn: iso,
      dueOn: nextDueOn(iso, cadence),
      title: '',
      done: false,
      priority: 'med',
      tags: [],
      subtasks: [],
      notes: '',
      streak: 0,
      assignee: null,
      isDraft: true,
    });
  };
  const saveDraft = async () => {
    if (!draft) return;
    const { isDraft: _isDraft, ...draftData } = draft;
    try {
      const result = await apiFetch<ApiTodo>('/api/todos', {
        method: 'POST',
        body: JSON.stringify({
          title: draftData.title,
          cadence: draftData.cadence,
          priority: draftData.priority,
          startsOn: draftData.startsOn,
          dueOn: nextDueOn(draftData.startsOn, draftData.cadence),
          notes: draftData.notes,
          assigneeId: draftData.assignee ?? null,
          tags: draftData.tags,
          subtasks: draftData.subtasks.map((s) => s.title),
        }),
      });
      setTasks((xs) => [...xs, mapApiTodo(result)]);
    } catch {
      setTasks((xs) => [...xs, draftData]);
    }
    setDraft(null);
    setOpenId(null);
    setClosing(false);
  };
  const deleteTask = (id: string) => {
    setOpenId(null);
    setDraft(null);
    setTasks((xs) => xs.filter((x) => x.id !== id));
    // Persist the removal so it survives a refresh. Drafts have non-numeric
    // uids and only exist client-side, so skip the API for those.
    const numId = Number(id);
    if (!isNaN(numId)) {
      apiFetch(`/api/todos/${numId}`, { method: 'DELETE' }).catch(() => {});
    }
  };

  const addSubtask = (title: string) => {
    if (!openTask) return;
    const numId = Number(openTask.id);
    if (openTask.isDraft) {
      setDraft((d) =>
        d ? { ...d, subtasks: [...d.subtasks, { id: uid(), title, done: false, taskId: 0 }] } : d,
      );
      return;
    }
    const taskId = openTask.id;
    const tempId = uid();
    setTasks((xs) =>
      xs.map((x) =>
        x.id === taskId
          ? { ...x, subtasks: [...x.subtasks, { id: tempId, title, done: false, taskId: numId }] }
          : x,
      ),
    );
    pendingSubtaskAdds.current += 1;
    apiFetch<ApiTodo>(`/api/todos/${numId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
      .then((result) => {
        pendingSubtaskAdds.current -= 1;
        // Only replace when all concurrent adds have settled so the last
        // response (which includes every saved subtask) wins.
        if (pendingSubtaskAdds.current === 0) {
          updateTask(taskId, {
            subtasks: result.subtasks.map((s) => ({
              id: String(s.id),
              title: s.title,
              done: s.done,
              taskId: numId,
            })),
          });
        }
      })
      .catch(() => {
        pendingSubtaskAdds.current -= 1;
      });
  };

  const uploadPhoto = async (file: File) => {
    if (!personId) throw new Error('Not signed in.');
    const body = new FormData();
    body.append('file', file);
    const p = await apiFetch<ApiPersonResponse>(
      `/api/persons/${personId}/photo`,
      { method: 'POST', body },
    );
    // Reflect the new photo in settings + every avatar. Skip the debounced
    // profile PUT here — the photo URL is already persisted by the POST above,
    // and re-sending it would only race that write.
    setSettings((s) => {
      const next = { ...s, profile: { ...s.profile, photo: p.photoUrl } };
      settingsRef.current = next;
      return next;
    });
  };

  const requestClose = () => {
    setClosing(true);
    setTimeout(() => {
      setOpenId(null);
      setDraft(null);
      setClosing(false);
    }, 280);
  };

  // ESC closes the detail sheet.
  useEffect(() => {
    const isOpen = !!openId || !!draft;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId, draft]);

  const todoCtx: TodoContextValue = {
    tasks,
    people,
    tweaks,
    query,
    setOpenId,
    toggleTask,
    createDraftFor,
    createOnDate,
  };

  if (!mounted) return null;
  if (!isAuthenticated && pathname !== '/login') return null;

  return (
    <SettingsCtx.Provider value={settings}>
      <MobileCtx.Provider value={isMobile}>
        <TodoCtx.Provider value={todoCtx}>
          <div
            style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
          >
            <TopBar
              query={query}
              setQuery={setQuery}
              layout={tweaks.layout}
              setLayout={(v: Layout) => setTweak('layout', v)}
              onOpenSettings={() => setSettingsOpen(true)}
            />

            {children}

            {(openId || draft) && openTask && (
              <DetailSheet
                task={openTask}
                closing={closing}
                onClose={requestClose}
                onChange={patchOpen}
                onToggle={toggleOpen}
                onDelete={() => deleteTask(openTask.id)}
                onSave={saveDraft}
                onAddSubtask={addSubtask}
                onToggleSubtask={toggleSubtask}
                onDeleteSubtask={deleteSubtask}
              />
            )}

            {settingsOpen && (
              <SettingsModal
                settings={settings}
                patch={patchSettings}
                onClose={() => setSettingsOpen(false)}
                onUploadPhoto={uploadPhoto}
              />
            )}

            <TweaksPanel title="Tweaks">
              <TweakRadio<Layout>
                label="Layout"
                value={tweaks.layout}
                onChange={(v) => setTweak('layout', v)}
                options={[
                  { value: 'stacked', label: 'Stacked' },
                  { value: 'calendar', label: 'Calendar' },
                ]}
              />
              <TweakColor
                label="Accent"
                value={tweaks.accent}
                onChange={(v) =>
                  setTweak('accent', typeof v === 'string' ? v : v[0])
                }
                options={Object.keys(ACCENTS)}
              />
              <TweakRadio<Tweaks['density']>
                label="Density"
                value={tweaks.density}
                onChange={(v) => setTweak('density', v)}
                options={[
                  { value: 'comfortable', label: 'Cozy' },
                  { value: 'compact', label: 'Compact' },
                ]}
              />
              <TweakToggle
                label="Hairlines"
                value={tweaks.showHairlines}
                onChange={(v) => setTweak('showHairlines', v)}
              />
            </TweaksPanel>
          </div>
        </TodoCtx.Provider>
      </MobileCtx.Provider>
    </SettingsCtx.Provider>
  );
}
