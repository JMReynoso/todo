import { createContext, useContext } from 'react';
import type { Settings } from '../_types';

export const defaultSettings: Settings = {
  profile: { name: 'You', email: '', color: '#c97a3c' },
  scoring: {
    streakThreshold: 3,
    includeDaily: true,
    includeWeekly: true,
    includeMonthly: false,
    includeQuarterly: false,
    includeOnce: false,
  },
};

export const SettingsCtx = createContext<Settings>(defaultSettings);

export const useSettings = (): Settings => useContext(SettingsCtx);
