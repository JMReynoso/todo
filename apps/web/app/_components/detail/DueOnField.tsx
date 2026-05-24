'use client';

import { useRef, useState } from 'react';
import { Icon } from '../atoms/Icon';
import { useDismissable } from '../../_hooks/useDismissable';
import { isoDate } from '../../_lib/dates';
import { MiniCalendar } from './MiniCalendar';

export interface DueOnFieldProps {
  /** ISO yyyy-mm-dd or empty. */
  value: string | undefined;
  onChange: (next: string) => void;
}

export function DueOnField({ value, onChange }: DueOnFieldProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useDismissable(open, ref, () => setOpen(false));

  const date = value ? new Date(value + 'T00:00:00') : null;
  const label =
    date && !isNaN(date.getTime())
      ? date.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : '+ pick a deadline';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 10px',
          marginLeft: -10,
          borderRadius: 6,
          fontSize: 14,
          color: value ? 'var(--ink)' : 'var(--ink-4)',
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
        <span>{label}</span>
        <Icon name="chevron" size={12} color="var(--ink-3)" />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: -10,
            zIndex: 100,
          }}
        >
          <MiniCalendar
            value={date}
            onPick={(d) => {
              onChange(isoDate(d));
              setOpen(false);
            }}
            onClear={() => {
              onChange('');
              setOpen(false);
            }}
            onCustom={() => {}}
            current=""
            hideFreeform
          />
        </div>
      )}
    </div>
  );
}
