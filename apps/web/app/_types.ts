export type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'once';

export type Priority = 'low' | 'med' | 'high';

export type PersonId = 'me' | 'maya' | 'devon' | 'sam' | 'nina';

export type Layout = 'stacked' | 'calendar';

export type Density = 'comfortable' | 'compact';

export interface Subtask {
  id: string;
  taskId: number;
  title: string;
  done: boolean;
}

export interface Task {
  id: number;
  cadence: Cadence;
  title: string;
  done: boolean;
  priority: Priority;
  /** Free-text recurrence hint, e.g. "today", "Fri 2p", "1st", "last Sun". */
  due: string;
  /** ISO yyyy-mm-dd deadline (optional, used by `once` tasks for hard dates). */
  dueOn?: string;
  /** ISO yyyy-mm-dd anchor date (used by `once` cadence). */
  date?: string;
  tags: string[];
  subtasks: Subtask[];
  notes: string;
  streak: number;
  assignee: PersonId | null;
  /** Present only on uncommitted drafts being edited in the detail modal. */
  isDraft?: boolean;
}

export interface Person {
  id: PersonId;
  name: string;
  initials: string;
  color: string;
  photo?: string | null;
}

export interface ProfileSettings {
  name: string;
  email: string;
  color: string;
  photo?: string | null;
}

export interface ScoringSettings {
  includeDaily: boolean;
  includeWeekly: boolean;
  includeMonthly: boolean;
  includeQuarterly: boolean;
  includeOnce: boolean;
  streakThreshold: number;
}

export interface Settings {
  profile: ProfileSettings;
  scoring: ScoringSettings;
}

export type SettingsSection = keyof Settings;

export interface Tweaks {
  layout: Layout;
  accent: string;
  density: Density;
  showHairlines: boolean;
}

export interface AccentTheme {
  accent: string;
  soft: string;
  ink: string;
  label: string;
}

export interface CadenceDef {
  id: Exclude<Cadence, 'once'>;
  label: string;
  note: string;
}

export interface HistoryBar {
  label: string;
  done: number;
  total: number;
  current: boolean;
}

export interface History {
  daily: HistoryBar[];
  weekly: HistoryBar[];
  monthly: HistoryBar[];
  quarterly: HistoryBar[];
}

export type IconName =
  | 'close'
  | 'plus'
  | 'more'
  | 'search'
  | 'filter'
  | 'flame'
  | 'calendar'
  | 'tag'
  | 'user'
  | 'chevron'
  | 'chart'
  | 'back'
  | 'gear'
  | 'list'
  | 'columns'
  | 'tabs'
  | 'stacked'
  | 'arrow'
  | 'trash';
