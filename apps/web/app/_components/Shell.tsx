'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { isoDate } from '../_lib/dates';
import { uid } from '../_lib/uid';
import type {
  Cadence,
  Layout,
  Settings,
  SettingsSection,
  Task,
  Tweaks,
} from '../_types';

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

  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (mounted && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [mounted, isAuthenticated, pathname, router]);

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tasks, setTasks] = useState<Task[]>(seed);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Task | null>(null);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const isMobile = useIsMobile();

  const patchSettings = <S extends SettingsSection>(
    section: S,
    patch: Partial<Settings[S]>,
  ) => setSettings((s) => ({ ...s, [section]: { ...s[section], ...patch } }));

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

  const toggleTask = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    updateTask(id, { done: !t.done });
  };

  // Patch whichever task the detail modal is currently showing — draft or saved.
  const patchOpen = (patch: Partial<Task>) => {
    if (draft) setDraft((d) => (d ? { ...d, ...patch } : d));
    else if (openTask) updateTask(openTask.id, patch);
  };
  const toggleOpen = () => {
    if (openTask) patchOpen({ done: !openTask.done });
  };

  // Hover-+ creates a DRAFT (not yet committed). Modal "Save" commits it.
  const createOnDate = (date: Date) => {
    const iso = isoDate(date);
    setDraft({
      id: uid(),
      cadence: 'once',
      date: iso,
      title: '',
      done: false,
      priority: 'med',
      due: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      tags: [],
      subtasks: [],
      notes: '',
      streak: 0,
      assignee: null,
      isDraft: true,
    });
  };
  // Click an "Add to ..." composer → spawn a draft for that cadence (no date).
  const createDraftFor = (cadence: Cadence) => {
    setDraft({
      id: uid(),
      cadence,
      title: '',
      done: false,
      priority: 'med',
      due: '',
      tags: [],
      subtasks: [],
      notes: '',
      streak: 0,
      assignee: null,
      isDraft: true,
    });
  };
  const saveDraft = () => {
    if (!draft) return;
    const { isDraft: _isDraft, ...committed } = draft;
    void _isDraft;
    setTasks((xs) => [...xs, committed]);
    setDraft(null);
    setOpenId(null);
    setClosing(false);
  };
  const deleteTask = (id: string) => {
    setOpenId(null);
    setDraft(null);
    setTasks((xs) => xs.filter((x) => x.id !== id));
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
              />
            )}

            {settingsOpen && (
              <SettingsModal
                settings={settings}
                patch={patchSettings}
                onClose={() => setSettingsOpen(false)}
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
