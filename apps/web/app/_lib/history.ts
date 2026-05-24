import type { History, Task } from '../_types';

/**
 * Stable pseudo-random history for the performance graphs.
 * Re-renders never reshuffle bars because the seed is derived from `tasks.length`.
 */
export function buildHistory(tasks: Task[]): History {
  let seed = (tasks.length * 9301 + 49297) & 0x7fffffff;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const sim = (total: number) =>
    Math.max(0, Math.min(total, Math.round(total * (0.42 + rng() * 0.55))));

  const totalDaily = Math.max(1, tasks.filter((t) => t.cadence === 'daily').length);
  const totalWeekly = Math.max(1, tasks.filter((t) => t.cadence === 'weekly').length);
  const totalMonthly = Math.max(1, tasks.filter((t) => t.cadence === 'monthly').length);
  const totalQuarterly = Math.max(1, tasks.filter((t) => t.cadence === 'quarterly').length);

  const doneNow = (c: Task['cadence']) =>
    tasks.filter((t) => t.cadence === c && t.done).length;

  const today = new Date();

  const daily: History['daily'] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const label = d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3).toLowerCase();
    daily.push({
      label,
      done: i === 0 ? doneNow('daily') : sim(totalDaily),
      total: totalDaily,
      current: i === 0,
    });
  }

  const weekly: History['weekly'] = [];
  for (let i = 3; i >= 0; i--) {
    weekly.push({
      label: i === 0 ? 'this wk' : `wk -${i}`,
      done: i === 0 ? doneNow('weekly') : sim(totalWeekly),
      total: totalWeekly,
      current: i === 0,
    });
  }

  const monthLabels = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthly: History['monthly'] = [];
  const curMonth = today.getMonth();
  for (let i = 11; i >= 0; i--) {
    const mIdx = (curMonth - i + 12) % 12;
    monthly.push({
      label: monthLabels[mIdx],
      done: i === 0 ? doneNow('monthly') : sim(totalMonthly),
      total: totalMonthly,
      current: i === 0,
    });
  }

  const quarterly: History['quarterly'] = [];
  const curQ = Math.floor(curMonth / 3);
  for (let i = 3; i >= 0; i--) {
    const qIdx = (curQ - i + 4) % 4;
    quarterly.push({
      label: `q${qIdx + 1}`,
      done: i === 0 ? doneNow('quarterly') : sim(totalQuarterly),
      total: totalQuarterly,
      current: i === 0,
    });
  }

  return { daily, weekly, monthly, quarterly };
}
