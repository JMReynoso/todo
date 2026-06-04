export type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'once';

export type Priority = 'low' | 'med' | 'high';

export type PersonId = number;

export type Layout = 'stacked' | 'calendar';

export type Density = 'comfortable' | 'compact';

export interface Subtask {
  id: string;
  taskId: number;
  title: string;
  done: boolean;
}

export interface ApiScore {
  personId: number;
  name: string;
  score: number;
}

export interface Task {
  id: string;
  cadence: Cadence;
  title: string;
  done: boolean;
  priority: Priority;
  /** ISO yyyy-mm-dd anchor the user picks (calendar picker). Required. */
  startsOn: string;
  /**
   * ISO yyyy-mm-dd, derived and locked: `startsOn` advanced by one cadence
   * period (one-offs are due on their `startsOn`). Never edited directly.
   */
  dueOn?: string;
  tags: string[];
  subtasks: Subtask[];
  notes: string;
  streak: number;
  /**
   * Every ISO yyyy-mm-dd this task was checked off. Unlike `done` (the current
   * period's flag, wiped on reset), this is the durable per-day ledger the
   * calendar reads to mark which past occurrences were completed.
   */
  completedDates: string[];
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
  | 'trash'
  | 'grip';
