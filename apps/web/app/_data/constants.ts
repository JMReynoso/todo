import type { AccentTheme, Cadence, CadenceDef, Person } from '../_types';

/** Keyed by hex hero so TweakColor swatches render real chips. */
export const ACCENTS: Record<string, AccentTheme> = {
  '#c97a3c': {
    accent: 'oklch(0.62 0.14 55)',
    soft: 'oklch(0.94 0.04 65)',
    ink: 'oklch(0.42 0.12 50)',
    label: 'Amber',
  },
  '#3d3a35': {
    accent: 'oklch(0.30 0.02 60)',
    soft: 'oklch(0.92 0.01 60)',
    ink: 'oklch(0.22 0.02 60)',
    label: 'Ink',
  },
  '#6a8c5d': {
    accent: 'oklch(0.55 0.10 145)',
    soft: 'oklch(0.93 0.04 145)',
    ink: 'oklch(0.38 0.08 145)',
    label: 'Moss',
  },
  '#4a76b8': {
    accent: 'oklch(0.55 0.13 250)',
    soft: 'oklch(0.94 0.04 245)',
    ink: 'oklch(0.38 0.10 250)',
    label: 'Cobalt',
  },
};

export const CADENCES: CadenceDef[] = [
  { id: 'daily', label: 'Daily', note: 'today' },
  { id: 'weekly', label: 'Weekly', note: 'this week' },
  { id: 'monthly', label: 'Monthly', note: 'this month' },
  { id: 'quarterly', label: 'Quarterly', note: 'this quarter' },
];

export const PEOPLE: Person[] = [
  { id: 'me', name: 'You', initials: 'Y', color: 'oklch(0.62 0.14 55)' },
  { id: 'maya', name: 'Maya O.', initials: 'MO', color: 'oklch(0.58 0.12 200)' },
  { id: 'devon', name: 'Devon L.', initials: 'DL', color: 'oklch(0.55 0.14 290)' },
  { id: 'sam', name: 'Sam P.', initials: 'SP', color: 'oklch(0.62 0.14 20)' },
  { id: 'nina', name: 'Nina K.', initials: 'NK', color: 'oklch(0.55 0.12 145)' },
];

export const URGENCY_WINDOW_HOURS: Record<Cadence, number> = {
  daily: 8,
  weekly: 60,
  monthly: 120,
  quarterly: 336,
  once: 48,
};

export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
