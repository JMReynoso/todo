import type { ReactNode } from 'react';

export type PillTone = 'neutral' | 'accent' | 'danger' | 'ghost';
export type PillSize = 'sm' | 'md';

export interface PillProps {
  children: ReactNode;
  tone?: PillTone;
  size?: PillSize;
}

const PALETTE: Record<PillTone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: 'var(--bg-sunken)', fg: 'var(--ink-2)', bd: 'transparent' },
  accent: { bg: 'var(--accent-soft)', fg: 'var(--accent-ink)', bd: 'transparent' },
  danger: { bg: 'oklch(0.95 0.04 25)', fg: 'var(--danger)', bd: 'transparent' },
  ghost: { bg: 'transparent', fg: 'var(--ink-3)', bd: 'var(--line)' },
};

export function Pill({ children, tone = 'neutral', size = 'sm' }: PillProps) {
  const palette = PALETTE[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--mono)',
        fontSize: size === 'sm' ? 10.5 : 11.5,
        letterSpacing: '0.02em',
        padding: size === 'sm' ? '2px 7px' : '3px 9px',
        borderRadius: 999,
        background: palette.bg,
        color: palette.fg,
        border: `0.5px solid ${palette.bd}`,
        textTransform: 'lowercase',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
