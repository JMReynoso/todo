'use client';

import { useRef, useState } from 'react';
import { Icon } from '../atoms/Icon';
import { useDismissable } from '../../_hooks/useDismissable';
import { formatDate, parseLooseDate } from '../../_lib/dates';
import { MiniCalendar } from './MiniCalendar';

export interface WhenFieldProps {
  value: string;
  onChange: (next: string) => void;
}

export function WhenField({ value, onChange }: WhenFieldProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useDismissable(open, ref, () => setOpen(false));

  const parsed = parseLooseDate(value);
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
        <span>{value || '+ set a date'}</span>
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
            value={parsed}
            onPick={(d) => {
              onChange(formatDate(d));
              setOpen(false);
            }}
            onClear={() => {
              onChange('');
              setOpen(false);
            }}
            onCustom={(v) => {
              onChange(v);
              setOpen(false);
            }}
            current={value}
          />
        </div>
      )}
    </div>
  );
}
