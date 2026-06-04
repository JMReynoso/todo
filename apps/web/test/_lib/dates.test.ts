import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@/app/_types';
import {
  cadencePeriodLabel,
  endOfWindow,
  formatDate,
  formatIso,
  isCompletedOn,
  isoDate,
  nextDueOn,
  nextResetLabel,
  taskUrgency,
  tasksOnDate,
} from '@/app/_lib/dates';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    cadence: 'daily',
    title: 'Task',
    done: false,
    priority: 'med',
    startsOn: '2026-06-01',
    tags: [],
    subtasks: [],
    notes: '',
    streak: 0,
    completedDates: [],
    assignee: null,
    ...overrides,
  };
}

describe('isoDate', () => {
  it('formats a date as zero-padded yyyy-mm-dd', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(isoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('endOfWindow', () => {
  it('returns null when the task has no due date', () => {
    expect(endOfWindow(makeTask({ dueOn: undefined }))).toBeNull();
  });

  it('returns the end of the due day', () => {
    const d = endOfWindow(makeTask({ dueOn: '2026-06-10' }));
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getHours()).toBe(23);
    expect(d!.getMinutes()).toBe(59);
  });

  it('returns null for an unparseable due date', () => {
    expect(endOfWindow(makeTask({ dueOn: 'not-a-date' }))).toBeNull();
  });
});

describe('taskUrgency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T12:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is 0 for completed tasks', () => {
    expect(taskUrgency(makeTask({ done: true, dueOn: '2026-06-10' }))).toBe(0);
  });

  it('is 0 when there is no due date', () => {
    expect(taskUrgency(makeTask({ dueOn: undefined }))).toBe(0);
  });

  it('is 1 once the due window has fully elapsed', () => {
    // End of 2026-06-09 (23:59:59) is already behind "now" (noon 2026-06-10).
    expect(taskUrgency(makeTask({ dueOn: '2026-06-09' }))).toBe(1);
    expect(taskUrgency(makeTask({ dueOn: '2026-06-01' }))).toBe(1);
  });

  it('is 0 when the due date is beyond the cadence lead window', () => {
    // daily window is 8h; due tomorrow night is well beyond that.
    expect(taskUrgency(makeTask({ cadence: 'daily', dueOn: '2026-06-11' }))).toBe(0);
  });

  it('ramps between 0 and 1 inside the lead window', () => {
    // weekly window is 60h. Due 2026-06-12 23:59:59 → ~60h away from now.
    const u = taskUrgency(makeTask({ cadence: 'weekly', dueOn: '2026-06-12' }));
    expect(u).toBeGreaterThanOrEqual(0);
    expect(u).toBeLessThanOrEqual(1);
  });

  it('returns non-zero urgency for an overdue once task (gradient suppressed at render layer)', () => {
    // taskUrgency itself does not special-case "once" — the red gradient is
    // suppressed in TaskRow (issue #38). This test documents that contract so
    // the suppression is not accidentally moved into this function.
    const u = taskUrgency(makeTask({ cadence: 'once', dueOn: '2026-06-09' }));
    expect(u).toBe(1);
  });
});

describe('nextDueOn', () => {
  it('advances daily by one day', () => {
    expect(nextDueOn('2026-06-01', 'daily')).toBe('2026-06-02');
  });
  it('advances weekly by seven days', () => {
    expect(nextDueOn('2026-06-01', 'weekly')).toBe('2026-06-08');
  });
  it('advances monthly by one month', () => {
    expect(nextDueOn('2026-06-01', 'monthly')).toBe('2026-07-01');
  });
  it('advances quarterly by three months', () => {
    expect(nextDueOn('2026-06-01', 'quarterly')).toBe('2026-09-01');
  });
  it('leaves one-offs on their anchor date', () => {
    expect(nextDueOn('2026-06-01', 'once')).toBe('2026-06-01');
  });
  it('returns the input unchanged when it is not a valid date', () => {
    expect(nextDueOn('garbage', 'daily')).toBe('garbage');
  });
});

describe('tasksOnDate', () => {
  const date = new Date(2026, 5, 10); // Wed 2026-06-10

  it('always includes daily tasks', () => {
    const out = tasksOnDate([makeTask({ id: 'd', cadence: 'daily' })], date);
    expect(out.map((t) => t.id)).toContain('d');
  });

  it('includes a one-off only on its start date', () => {
    const on = makeTask({ id: 'o', cadence: 'once', startsOn: '2026-06-10' });
    const off = makeTask({ id: 'x', cadence: 'once', startsOn: '2026-06-11' });
    const out = tasksOnDate([on, off], date);
    expect(out.map((t) => t.id)).toEqual(['o']);
  });

  it('skips recurring tasks without a valid anchor', () => {
    const out = tasksOnDate(
      [makeTask({ id: 'w', cadence: 'weekly', startsOn: '' })],
      date,
    );
    expect(out).toHaveLength(0);
  });

  it('places weekly tasks on the matching weekday', () => {
    // 2026-06-03 is a Wednesday, same weekday as the target date.
    const match = makeTask({ id: 'w', cadence: 'weekly', startsOn: '2026-06-03' });
    const noMatch = makeTask({ id: 'w2', cadence: 'weekly', startsOn: '2026-06-04' });
    const out = tasksOnDate([match, noMatch], date);
    expect(out.map((t) => t.id)).toEqual(['w']);
  });

  it('places monthly tasks on the matching day of month', () => {
    const match = makeTask({ id: 'm', cadence: 'monthly', startsOn: '2026-03-10' });
    const noMatch = makeTask({ id: 'm2', cadence: 'monthly', startsOn: '2026-03-11' });
    const out = tasksOnDate([match, noMatch], date);
    expect(out.map((t) => t.id)).toEqual(['m']);
  });

  it('places quarterly tasks on matching day and quarter offset', () => {
    // target month June (index 5), 5 % 3 === 2. March (index 2), 2 % 3 === 2.
    const match = makeTask({ id: 'q', cadence: 'quarterly', startsOn: '2026-03-10' });
    const out = tasksOnDate([match], date);
    expect(out.map((t) => t.id)).toEqual(['q']);
  });
});

describe('isCompletedOn', () => {
  const date = new Date(2026, 5, 10); // 2026-06-10

  it('is true when the day is in the ledger', () => {
    const t = makeTask({ completedDates: ['2026-06-09', '2026-06-10'] });
    expect(isCompletedOn(t, date)).toBe(true);
  });

  it('is false when the day is not in the ledger', () => {
    const t = makeTask({ completedDates: ['2026-06-09'] });
    expect(isCompletedOn(t, date)).toBe(false);
  });

  it('is false for an empty ledger', () => {
    expect(isCompletedOn(makeTask({ completedDates: [] }), date)).toBe(false);
  });

  it('reads each day independently, so one occurrence can differ from another', () => {
    // A recurring task completed last Wednesday but not this one.
    const t = makeTask({ cadence: 'weekly', completedDates: ['2026-06-03'] });
    expect(isCompletedOn(t, new Date(2026, 5, 3))).toBe(true);
    expect(isCompletedOn(t, new Date(2026, 5, 10))).toBe(false);
  });
});

describe('nextResetLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T12:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a lowercase string for recurring cadences', () => {
    for (const c of ['daily', 'weekly', 'monthly', 'quarterly'] as const) {
      const label = nextResetLabel(c);
      expect(label).toBeTypeOf('string');
      expect(label).toBe(label!.toLowerCase());
    }
  });

  it('returns null for one-offs', () => {
    expect(nextResetLabel('once')).toBeNull();
  });
});

describe('cadencePeriodLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T12:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a non-empty label for each recurring cadence', () => {
    for (const c of ['daily', 'weekly', 'monthly', 'quarterly'] as const) {
      expect(cadencePeriodLabel(c).length).toBeGreaterThan(0);
    }
  });

  it('includes the ISO week number for weekly', () => {
    expect(cadencePeriodLabel('weekly')).toMatch(/wk \d+\/52/);
  });

  it('includes the quarter number for quarterly', () => {
    expect(cadencePeriodLabel('quarterly')).toMatch(/^Q[1-4] ·/);
  });

  it('returns an empty string for one-offs', () => {
    expect(cadencePeriodLabel('once')).toBe('');
  });
});

describe('formatDate / formatIso', () => {
  it('formats a date to a short month/day label', () => {
    expect(formatDate(new Date(2026, 5, 10))).toMatch(/\d/);
  });
  it('returns an empty string for missing or invalid ISO input', () => {
    expect(formatIso(undefined)).toBe('');
    expect(formatIso('nope')).toBe('');
  });
  it('formats a valid ISO string', () => {
    expect(formatIso('2026-06-10')).toMatch(/\d/);
  });
});
