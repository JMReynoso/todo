import { URGENCY_WINDOW_HOURS } from '../_data/constants';
import type { Cadence, Task } from '../_types';

/**
 * End of the cadence window for a task — when a recurring task being checked
 * off would reset to "open" again, or the hard deadline for one-offs.
 */
export function endOfWindow(task: Task): Date | null {
  const now = new Date();
  if (task.cadence === 'once') {
    if (!task.dueOn) return null;
    const d = new Date(task.dueOn + 'T23:59:59');
    return isNaN(d.getTime()) ? null : d;
  }
  if (task.cadence === 'daily') {
    const eod = new Date(now);
    eod.setHours(23, 59, 59, 999);
    return eod;
  }
  if (task.cadence === 'weekly') {
    const daysToSun = (7 - now.getDay()) % 7;
    const end = new Date(now);
    end.setDate(now.getDate() + daysToSun);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  if (task.cadence === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  // quarterly
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999);
}

/**
 * 0..1 urgency for in-progress tasks based on how close we are to the end of
 * the cadence window. Daily ramps from 4pm to midnight; weekly over the last
 * 60h; monthly the last 5d; quarterly the last 2w; one-offs the last 48h.
 */
export function taskUrgency(task: Task): number {
  if (task.done) return 0;
  const end = endOfWindow(task);
  if (!end) return 0;
  const hoursLeft = (end.getTime() - Date.now()) / 3600000;
  if (hoursLeft <= 0) return 1;
  const win = URGENCY_WINDOW_HOURS[task.cadence];
  if (!win || hoursLeft >= win) return 0;
  return Math.max(0, Math.min(1, 1 - hoursLeft / win));
}

export function nextResetLabel(cadence: Cadence): string | null {
  const d = new Date();
  if (cadence === 'daily') {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    return next.toLocaleDateString(undefined, { weekday: 'short' }).toLowerCase();
  }
  if (cadence === 'weekly') {
    const daysUntilSun = (7 - d.getDay()) % 7 || 7;
    const next = new Date(d);
    next.setDate(d.getDate() + daysUntilSun);
    return next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase();
  }
  if (cadence === 'monthly') {
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase();
  }
  if (cadence === 'quarterly') {
    const q = Math.floor(d.getMonth() / 3);
    const next = new Date(d.getFullYear() + (q === 3 ? 1 : 0), ((q + 1) % 4) * 3, 1);
    return next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase();
  }
  return null;
}

export function cadencePeriodLabel(id: Cadence): string {
  const d = new Date();
  if (id === 'daily') return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (id === 'weekly') {
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay()); // Sunday
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (x: Date) => x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    // ISO 8601 week number
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const wk = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${fmt(start)} – ${fmt(end).split(' ').pop()} · wk ${wk}/52`;
  }
  if (id === 'monthly') return d.toLocaleDateString(undefined, { month: 'long' });
  if (id === 'quarterly') {
    const q = Math.floor(d.getMonth() / 3) + 1;
    const months = ['Jan', 'Apr', 'Jul', 'Oct'];
    const ends = ['Mar', 'Jun', 'Sep', 'Dec'];
    return `Q${q} · ${months[q - 1]} – ${ends[q - 1]}`;
  }
  return '';
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Derives the locked DueOn from the user-chosen StartsOn anchor: one cadence
 * period later. One-offs are due on their anchor. Mirrors the backend's
 * Todo.AddPeriod — keep the two in sync.
 */
export function nextDueOn(startsOn: string, cadence: Cadence): string {
  const d = new Date(startsOn + 'T00:00:00');
  if (isNaN(d.getTime())) return startsOn;
  if (cadence === 'daily') d.setDate(d.getDate() + 1);
  else if (cadence === 'weekly') d.setDate(d.getDate() + 7);
  else if (cadence === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (cadence === 'quarterly') d.setMonth(d.getMonth() + 3);
  // 'once': due on its anchor date — no advance.
  return isoDate(d);
}

export function tasksOnDate(tasks: Task[], date: Date): Task[] {
  const wd = date.getDay();
  const dm = date.getDate();
  const month = date.getMonth();
  const lastDay = new Date(date.getFullYear(), month + 1, 0).getDate();
  const iso = isoDate(date);
  const out: Task[] = [];
  for (const t of tasks) {
    const anchor = t.startsOn ? new Date(t.startsOn + 'T00:00:00') : null;
    if (t.cadence === 'once') {
      if (t.startsOn === iso) out.push(t); // one-off shows on its date
    } else if (t.cadence === 'daily') {
      out.push(t);
    } else if (!anchor || isNaN(anchor.getTime())) {
      continue; // recurring task needs a valid anchor to place
    } else if (t.cadence === 'weekly') {
      if (anchor.getDay() === wd) out.push(t);
    } else if (t.cadence === 'monthly') {
      if (Math.min(anchor.getDate(), lastDay) === dm) out.push(t);
    } else if (t.cadence === 'quarterly') {
      if (Math.min(anchor.getDate(), lastDay) === dm && month % 3 === anchor.getMonth() % 3)
        out.push(t);
    }
  }
  return out;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Formats an ISO yyyy-mm-dd string as a short "Mon d" label, or '' if invalid. */
export function formatIso(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? '' : formatDate(d);
}
