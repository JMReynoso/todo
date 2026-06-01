import { describe, expect, it } from 'vitest';
import type { Task } from '../_types';
import { buildHistory } from './history';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(36).slice(2),
    cadence: 'daily',
    title: 'Task',
    done: false,
    priority: 'med',
    startsOn: '2026-06-01',
    tags: [],
    subtasks: [],
    notes: '',
    streak: 0,
    assignee: null,
    ...overrides,
  };
}

describe('buildHistory', () => {
  const tasks: Task[] = [
    makeTask({ cadence: 'daily', done: true }),
    makeTask({ cadence: 'daily', done: false }),
    makeTask({ cadence: 'weekly', done: true }),
    makeTask({ cadence: 'monthly' }),
    makeTask({ cadence: 'quarterly', done: true }),
  ];

  it('returns the expected number of bars per cadence', () => {
    const h = buildHistory(tasks);
    expect(h.daily).toHaveLength(7);
    expect(h.weekly).toHaveLength(4);
    expect(h.monthly).toHaveLength(12);
    expect(h.quarterly).toHaveLength(4);
  });

  it('marks exactly one current bar per series', () => {
    const h = buildHistory(tasks);
    for (const series of [h.daily, h.weekly, h.monthly, h.quarterly]) {
      expect(series.filter((b) => b.current)).toHaveLength(1);
      // The current bar is always last.
      expect(series[series.length - 1].current).toBe(true);
    }
  });

  it('uses live done counts for the current bar', () => {
    const h = buildHistory(tasks);
    expect(h.daily[h.daily.length - 1].done).toBe(1); // one done daily task
    expect(h.weekly[h.weekly.length - 1].done).toBe(1);
    expect(h.quarterly[h.quarterly.length - 1].done).toBe(1);
  });

  it('is deterministic for a given task-list length', () => {
    const a = buildHistory(tasks);
    const b = buildHistory(tasks);
    expect(a).toEqual(b);
  });

  it('keeps simulated done counts within [0, total]', () => {
    const h = buildHistory(tasks);
    for (const series of [h.daily, h.weekly, h.monthly, h.quarterly]) {
      for (const bar of series) {
        expect(bar.done).toBeGreaterThanOrEqual(0);
        expect(bar.done).toBeLessThanOrEqual(bar.total);
      }
    }
  });

  it('uses a floor total of 1 even with no tasks', () => {
    const h = buildHistory([]);
    expect(h.daily[0].total).toBe(1);
    expect(h.weekly[0].total).toBe(1);
  });
});
