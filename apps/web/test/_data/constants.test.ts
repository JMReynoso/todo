import { describe, expect, it } from 'vitest';
import { ACCENTS, CADENCES, URGENCY_WINDOW_HOURS, WEEKDAYS } from '@/app/_data/constants';

describe('constants', () => {
  it('defines an urgency window for every cadence', () => {
    for (const c of ['daily', 'weekly', 'monthly', 'quarterly', 'once'] as const) {
      expect(URGENCY_WINDOW_HOURS[c]).toBeGreaterThan(0);
    }
  });

  it('orders cadences from shortest to longest urgency window', () => {
    const { daily, weekly, monthly, quarterly } = URGENCY_WINDOW_HOURS;
    expect(daily).toBeLessThan(weekly);
    expect(weekly).toBeLessThan(monthly);
    expect(monthly).toBeLessThan(quarterly);
  });

  it('lists the four recurring cadences with labels', () => {
    expect(CADENCES.map((c) => c.id)).toEqual(['daily', 'weekly', 'monthly', 'quarterly']);
    for (const c of CADENCES) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.note.length).toBeGreaterThan(0);
    }
  });

  it('exposes a full accent theme per swatch', () => {
    const themes = Object.values(ACCENTS);
    expect(themes.length).toBeGreaterThan(0);
    for (const t of themes) {
      expect(t).toMatchObject({
        accent: expect.any(String),
        soft: expect.any(String),
        ink: expect.any(String),
        label: expect.any(String),
      });
    }
  });

  it('has seven weekdays starting on sunday', () => {
    expect(WEEKDAYS).toHaveLength(7);
    expect(WEEKDAYS[0]).toBe('sun');
  });
});
