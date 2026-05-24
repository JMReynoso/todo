'use client';

import { useState } from 'react';
import { Icon } from '../atoms/Icon';
import type { Cadence } from '../../_types';

export interface ComposerProps {
  cadence: Cadence;
  onAdd: (cadence: Cadence) => void;
  compact?: boolean;
}

export function Composer({ cadence, onAdd, compact }: ComposerProps) {
  const [hover, setHover] = useState(false);
  const label = cadence === 'once' ? 'one-off' : cadence;
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onAdd(cadence)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: compact ? '10px 6px 8px' : '14px 6px',
        marginTop: compact ? 6 : 4,
        borderTop: compact ? '1px solid var(--line)' : 'none',
        width: '100%',
        textAlign: 'left',
        borderRadius: 6,
        color: hover ? 'var(--ink)' : 'var(--ink-3)',
        background: hover ? 'var(--bg-sunken)' : 'transparent',
        transition: 'background 140ms ease, color 140ms ease',
        marginLeft: -6,
        marginRight: -6,
        paddingLeft: 6,
        paddingRight: 6,
      }}
    >
      <div
        style={{
          width: compact ? 16 : 18,
          height: compact ? 16 : 18,
          borderRadius: 5,
          border: `1.25px ${hover ? 'solid var(--ink-3)' : 'dashed var(--line-strong)'}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: hover ? 'var(--ink-2)' : 'var(--ink-4)',
          transition: 'border-color 140ms ease, color 140ms ease',
        }}
      >
        <Icon name="plus" size={compact ? 10 : 12} color="currentColor" stroke={1.8} />
      </div>
      <span style={{ flex: 1, fontSize: compact ? 13 : 15 }}>Add to {label}…</span>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: hover ? 'var(--ink-3)' : 'var(--ink-4)',
          opacity: hover ? 1 : 0.6,
          transition: 'opacity 140ms ease, color 140ms ease',
        }}
      >
        open details ↗
      </span>
    </button>
  );
}
