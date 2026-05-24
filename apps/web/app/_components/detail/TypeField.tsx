'use client';

import { useRef, useState } from 'react';
import { Icon } from '../atoms/Icon';
import { useDismissable } from '../../_hooks/useDismissable';
import type { Cadence } from '../../_types';

export interface TypeFieldProps {
  value: Cadence;
  onChange: (next: Cadence) => void;
}

interface CadenceOption {
  id: Cadence;
  label: string;
  note: string;
}

const OPTS: CadenceOption[] = [
  { id: 'once', label: 'Once', note: 'one-off, not scored' },
  { id: 'daily', label: 'Daily', note: 'every day' },
  { id: 'weekly', label: 'Weekly', note: 'every week' },
  { id: 'monthly', label: 'Monthly', note: 'every month' },
  { id: 'quarterly', label: 'Quarterly', note: 'every quarter' },
];

const DOT_COLOR: Record<Cadence, string> = {
  once: 'var(--ink-3)',
  daily: 'oklch(0.55 0.10 60)',
  weekly: 'oklch(0.55 0.10 220)',
  monthly: 'oklch(0.55 0.10 290)',
  quarterly: 'oklch(0.55 0.12 30)',
};

export function TypeField({ value, onChange }: TypeFieldProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useDismissable(open, ref, () => setOpen(false));

  const cur = OPTS.find((o) => o.id === value) || OPTS[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 9,
          padding: '4px 10px',
          marginLeft: -10,
          borderRadius: 6,
          fontSize: 14,
          color: 'var(--ink)',
          background: open ? 'var(--bg-sunken)' : 'transparent',
          transition: 'background 140ms ease',
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = 'var(--bg-sunken)';
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = 'transparent';
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: DOT_COLOR[cur.id],
            flex: 'none',
          }}
        />
        <span>{cur.label.toLowerCase()}</span>
        <Icon name="chevron" size={12} color="var(--ink-3)" />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: -10,
            zIndex: 100,
            minWidth: 240,
            padding: 6,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            boxShadow: '0 18px 44px -18px rgba(20,16,10,0.22)',
          }}
        >
          <div
            style={{
              padding: '6px 10px 8px',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-4)',
            }}
          >
            Task type
          </div>
          {OPTS.map((o) => {
            const active = o.id === cur.id;
            return (
              <button
                key={o.id}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
                  fontSize: 13.5,
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--bg-sunken)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: DOT_COLOR[o.id],
                    flex: 'none',
                  }}
                />
                <span style={{ flex: 1 }}>{o.label.toLowerCase()}</span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    color: active ? 'var(--accent-ink)' : 'var(--ink-4)',
                    opacity: 0.85,
                  }}
                >
                  {o.note}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
