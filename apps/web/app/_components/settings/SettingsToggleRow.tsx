'use client';

import { Toggle } from '../atoms/Toggle';

export interface SettingsToggleRowProps {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}

export function SettingsToggleRow({
  label,
  hint,
  value,
  onChange,
}: SettingsToggleRowProps) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        cursor: 'pointer',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: 'var(--ink)' }}>{label}</div>
        {hint && (
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-3)',
              marginTop: 2,
              letterSpacing: '0.02em',
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}
