'use client';

import { createContext, useContext } from 'react';
import type { Cadence, Task, Tweaks } from '../_types';

/**
 * State exposed to route pages by the (todo) shell.
 *
 * The shell layout owns the tasks/tweaks/query state and renders TopBar,
 * DetailSheet, SettingsModal, and TweaksPanel around `{children}`. Pages
 * consume what they need via {@link useTodo}.
 */
export interface TodoContextValue {
  tasks: Task[];
  tweaks: Tweaks;
  query: string;
  setOpenId: (id: string) => void;
  toggleTask: (id: string) => void;
  createDraftFor: (cadence: Cadence) => void;
  createOnDate: (date: Date) => void;
}

export const TodoCtx = createContext<TodoContextValue | null>(null);

export function useTodo(): TodoContextValue {
  const ctx = useContext(TodoCtx);
  if (!ctx) {
    throw new Error('useTodo must be used inside the (todo) route group');
  }
  return ctx;
}
