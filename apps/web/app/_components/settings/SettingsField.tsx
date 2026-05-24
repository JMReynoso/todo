import type { ReactNode } from 'react';

export interface SettingsFieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function SettingsField({ label, hint, children }: SettingsFieldProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-3)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      {children}
      {hint && (
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10.5,
            color: 'var(--ink-4)',
            letterSpacing: '0.02em',
          }}
        >
          {hint}
        </div>
      )}
    </label>
  );
}
