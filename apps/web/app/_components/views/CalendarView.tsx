'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useMobile } from '../../_context/MobileCtx';
import { CADENCES, HISTORY_RETENTION_MONTHS } from '../../_data/constants';
import { earliestHistoryMonth, monthProgress, tasksOnDate } from '../../_lib/dates';
import type { Task } from '../../_types';
import { Progress } from '../atoms/Progress';
import { DayCell, type CadenceColorMap } from './DayCell';

export interface CalendarViewProps {
  tasks: Task[];
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onCreateOnDate: (date: Date) => void;
  query: string;
}

const navBtnStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 999,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-elev)',
  border: '1px solid var(--line)',
  color: 'var(--ink-2)',
  transition: 'background 140ms ease',
};

const cadenceTint: CadenceColorMap = {
  daily: 'oklch(0.95 0.02 60)',
  weekly: 'oklch(0.94 0.05 200)',
  monthly: 'oklch(0.93 0.05 290)',
  quarterly: 'oklch(0.94 0.06 30)',
  once: 'oklch(0.96 0.005 60)',
};
const cadenceInk: CadenceColorMap = {
  daily: 'oklch(0.40 0.06 60)',
  weekly: 'oklch(0.40 0.10 220)',
  monthly: 'oklch(0.40 0.10 290)',
  quarterly: 'oklch(0.40 0.12 30)',
  once: 'oklch(0.30 0.02 60)',
};

export function CalendarView({
  tasks,
  onOpen,
  onCreateOnDate,
  query,
}: CalendarViewProps) {
  const today = new Date();
  const isMobile = useMobile();
  const [view, setView] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);
  const year = view.getFullYear();
  const month = view.getMonth();
  const monthLabel = view.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  // Backward navigation stops at the prune horizon — months before this have
  // had their completion history trimmed, so there's nothing to show.
  const earliest = earliestHistoryMonth(today, HISTORY_RETENTION_MONTHS);
  const canGoPrev =
    year > earliest.getFullYear() ||
    (year === earliest.getFullYear() && month > earliest.getMonth());
  const isFutureMonth =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month > today.getMonth());

  const progress = useMemo(() => {
    const visible = tasks.filter(
      (t) => !query || t.title.toLowerCase().includes(query.toLowerCase()),
    );
    return monthProgress(visible, year, month, new Date());
  }, [tasks, query, year, month]);

  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const filtered = tasks.filter(
    (t) => !query || t.title.toLowerCase().includes(query.toLowerCase()),
  );
  const sameDay = (a: Date | null, b: Date | null) =>
    !!a && !!b && a.toDateString() === b.toDateString();

  return (
    <main
      style={{
        flex: 1,
        padding: isMobile ? '16px 14px 60px' : '20px 36px 80px',
        maxWidth: 1280,
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 22,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'opacity 500ms ease, transform 600ms cubic-bezier(.22,.61,.36,1)',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10.5,
              color: 'var(--ink-3)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            calendar — recurring view
          </div>
          <h2
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 500,
              fontSize: isMobile ? 32 : 48,
              lineHeight: 0.98,
              margin: 0,
              color: 'var(--ink)',
              letterSpacing: '-0.035em',
            }}
          >
            {monthLabel.toLowerCase()}
            <span style={{ color: 'var(--accent)' }}>.</span>
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 14,
            }}
          >
            {progress.total > 0 && (
              <Progress done={progress.done} total={progress.total} />
            )}
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--ink-3)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {progress.total > 0
                ? `${progress.done} of ${progress.total} completed`
                : isFutureMonth
                  ? 'upcoming'
                  : 'no tasks scheduled'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isMobile && (
            <div style={{ display: 'flex', gap: 12, marginRight: 18 }}>
              {CADENCES.map((c) => (
                <div
                  key={c.id}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 3,
                      background: cadenceTint[c.id],
                      border: `0.5px solid ${cadenceInk[c.id]}`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10.5,
                      color: 'var(--ink-3)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={canGoPrev ? () => setView(new Date(year, month - 1, 1)) : undefined}
            disabled={!canGoPrev}
            title={
              canGoPrev
                ? 'Previous month'
                : `History is kept for ${HISTORY_RETENTION_MONTHS} months — earlier data has been pruned`
            }
            style={{
              ...navBtnStyle,
              opacity: canGoPrev ? 1 : 0.4,
              cursor: canGoPrev ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={
              canGoPrev
                ? (e) => (e.currentTarget.style.background = 'var(--bg-sunken)')
                : undefined
            }
            onMouseLeave={
              canGoPrev
                ? (e) => (e.currentTarget.style.background = 'var(--bg-elev)')
                : undefined
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            onClick={() =>
              setView(new Date(today.getFullYear(), today.getMonth(), 1))
            }
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-2)',
            }}
          >
            Today
          </button>
          <button
            onClick={() => setView(new Date(year, month + 1, 1))}
            style={navBtnStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-sunken)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-elev)')}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 1,
          marginBottom: 1,
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        {(isMobile
          ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
          : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        ).map((d, i) => (
          <div
            key={i}
            style={{
              padding: isMobile ? '8px 4px' : '10px 12px',
              fontFamily: 'var(--mono)',
              fontSize: isMobile ? 10 : 10.5,
              color: 'var(--ink-3)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textAlign: isMobile ? 'center' : 'left',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          background: 'var(--line)',
          gap: 1,
          border: '1px solid var(--line)',
          borderRadius: 12,
          overflow: 'hidden',
          opacity: mounted ? 1 : 0,
          transform: mounted
            ? 'translateY(0) scale(1)'
            : 'translateY(14px) scale(0.985)',
          transition:
            'opacity 600ms ease 120ms, transform 700ms cubic-bezier(.22,.61,.36,1) 120ms',
        }}
      >
        {cells.map((d, i) => {
          if (!d)
            return (
              <div
                key={i}
                style={{
                  background: 'var(--bg-sunken)',
                  minHeight: isMobile ? 64 : 124,
                }}
              />
            );
          return (
            <DayCell
              key={i}
              date={d}
              dayTasks={tasksOnDate(filtered, d)}
              isToday={sameDay(d, today)}
              isWeekend={d.getDay() === 0 || d.getDay() === 6}
              onOpen={onOpen}
              onAdd={onCreateOnDate}
              cadenceTint={cadenceTint}
              cadenceInk={cadenceInk}
            />
          );
        })}
      </div>

      <p
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10.5,
          color: 'var(--ink-4)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginTop: 16,
          textAlign: 'center',
        }}
      >
        recurrence inferred from each task&apos;s cadence + when. click any chip to open
        detail.
      </p>
    </main>
  );
}
