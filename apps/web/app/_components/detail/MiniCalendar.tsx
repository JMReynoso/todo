'use client';

import { useState, type CSSProperties } from 'react';

export interface MiniCalendarProps {
  value: Date | null;
  onPick: (d: Date) => void;
  onClear: () => void;
  onCustom: (v: string) => void;
  current: string;
  hideFreeform?: boolean;
}

const navBtn: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 6,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--ink-2)',
};

export function MiniCalendar({
  value,
  onPick,
  onClear,
  onCustom,
  current,
  hideFreeform,
}: MiniCalendarProps) {
  const today = new Date();
  const [view, setView] = useState<Date>(() => value || new Date());
  const [custom, setCustom] = useState(current || '');

  const year = view.getFullYear();
  const month = view.getMonth();
  const monthLabel = view.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const same = (a: Date | null, b: Date | null) =>
    !!a && !!b && a.toDateString() === b.toDateString();

  return (
    <div
      style={{
        width: 256,
        padding: 14,
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        boxShadow: '0 18px 44px -18px rgba(20,16,10,0.22)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <button
          onClick={() => setView(new Date(year, month - 1, 1))}
          style={navBtn}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-sunken)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span
          style={{
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            fontSize: 16,
            letterSpacing: '-0.01em',
          }}
        >
          {monthLabel}
        </span>
        <button
          onClick={() => setView(new Date(year, month + 1, 1))}
          style={navBtn}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-sunken)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          marginBottom: 4,
          letterSpacing: '0.04em',
        }}
      >
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              padding: '4px 0',
              textTransform: 'uppercase',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const isToday = same(d, today);
          const isSel = same(d, value);
          return (
            <button
              key={i}
              onClick={() => onPick(d)}
              style={{
                padding: '7px 0',
                fontSize: 12.5,
                borderRadius: 7,
                fontFamily: 'var(--mono)',
                background: isSel ? 'var(--accent)' : 'transparent',
                color: isSel ? '#fff' : isToday ? 'var(--accent-ink)' : 'var(--ink-2)',
                fontWeight: isToday ? 600 : 400,
                border: isToday && !isSel ? '1px solid var(--accent-soft)' : '1px solid transparent',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => {
                if (!isSel) e.currentTarget.style.background = 'var(--bg-sunken)';
              }}
              onMouseLeave={(e) => {
                if (!isSel) e.currentTarget.style.background = 'transparent';
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {!hideFreeform && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && custom.trim()) onCustom(custom.trim());
            }}
            placeholder="or type — e.g. every Friday"
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 6,
              background: 'var(--bg-sunken)',
              fontSize: 12,
              color: 'var(--ink-2)',
              fontFamily: 'var(--mono)',
            }}
          />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 10,
          gap: 8,
        }}
      >
        <button
          onClick={() => onPick(new Date())}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10.5,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ink-2)',
            padding: '5px 9px',
            borderRadius: 6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-sunken)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Today
        </button>
        <button
          onClick={onClear}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10.5,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            padding: '5px 9px',
            borderRadius: 6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-sunken)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
