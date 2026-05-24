'use client';

import type { ScoringSettings as ScoringSettingsValue } from '../../_types';
import { SettingsToggleRow } from './SettingsToggleRow';

export interface ScoringSettingsProps {
  scoring: ScoringSettingsValue;
  patch: (patch: Partial<ScoringSettingsValue>) => void;
}

type CadenceToggleKey =
  | 'includeDaily'
  | 'includeWeekly'
  | 'includeMonthly'
  | 'includeQuarterly'
  | 'includeOnce';

interface CadenceToggleDef {
  key: CadenceToggleKey;
  label: string;
  hint: string;
}

const CADENCE_TOGGLES: CadenceToggleDef[] = [
  { key: 'includeDaily', label: 'Daily tasks', hint: 'the bread-and-butter, recommended' },
  { key: 'includeWeekly', label: 'Weekly tasks', hint: 'count weeklies scheduled today' },
  { key: 'includeMonthly', label: 'Monthly tasks', hint: 'rarely fire on any given day' },
  { key: 'includeQuarterly', label: 'Quarterly tasks', hint: 'noisy when included' },
  { key: 'includeOnce', label: 'One-offs', hint: "off by default — they're ad-hoc" },
];

export function ScoringSettings({ scoring, patch }: ScoringSettingsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8 }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10.5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          padding: '6px 0 10px',
        }}
      >
        What counts toward today&apos;s score
      </div>
      {CADENCE_TOGGLES.map((t) => (
        <SettingsToggleRow
          key={t.key}
          label={t.label}
          hint={t.hint}
          value={scoring[t.key]}
          onChange={(v) => patch({ [t.key]: v } as Partial<ScoringSettingsValue>)}
        />
      ))}

      <div
        style={{ height: 1, background: 'var(--line)', margin: '16px 0 12px' }}
      />

      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10.5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          padding: '0 0 4px',
        }}
      >
        Streak
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 0',
        }}
      >
        <div>
          <div style={{ fontSize: 14, color: 'var(--ink)' }}>Show flame at</div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-3)',
              marginTop: 2,
              letterSpacing: '0.02em',
            }}
          >
            tasks with this many in a row light up
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={scoring.streakThreshold}
            onChange={(e) => patch({ streakThreshold: Number(e.target.value) })}
            style={{ width: 140, accentColor: 'var(--accent)' }}
          />
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 12,
              color: 'var(--ink)',
              minWidth: 28,
              textAlign: 'right',
            }}
          >
            {scoring.streakThreshold}
          </span>
        </div>
      </div>
    </div>
  );
}
