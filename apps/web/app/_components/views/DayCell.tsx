'use client';

import { useState, type CSSProperties } from 'react';
import { useMobile } from '../../_context/MobileCtx';
import type { Cadence, Task } from '../../_types';
import { DayModal } from './DayModal';

export type CadenceColorMap = Record<Cadence, string>;

/**
 * Desktop cells with this many tasks swap their inline chips for a windowed
 * day view. Mobile cells only ever show dots, so any non-empty mobile cell
 * opens the window on tap.
 */
const WINDOW_THRESHOLD = 5;

export interface DayCellProps {
  date: Date;
  dayTasks: Task[];
  isToday: boolean;
  isWeekend: boolean;
  onOpen: (id: string) => void;
  onAdd: (date: Date) => void;
  cadenceTint: CadenceColorMap;
  cadenceInk: CadenceColorMap;
}

export function DayCell({
  date,
  dayTasks,
  isToday,
  isWeekend,
  onOpen,
  onAdd,
  cadenceTint,
  cadenceInk,
}: DayCellProps) {
  const [hover, setHover] = useState(false);
  const [windowed, setWindowed] = useState(false);
  const isMobile = useMobile();
  // Mobile shows only dots, so any tap opens the window; desktop escalates at
  // the threshold once its inline chips overflow.
  const useWindow = isMobile ? dayTasks.length > 0 : dayTasks.length >= WINDOW_THRESHOLD;

  const visible = dayTasks.slice(0, 4);
  const overflow = dayTasks.length - visible.length;

  const chipStyle = (t: Task): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 7px 3px 6px',
    borderRadius: 5,
    background: cadenceTint[t.cadence],
    color: cadenceInk[t.cadence],
    fontSize: 11.5,
    lineHeight: 1.2,
    textAlign: 'left',
    borderLeft: `2px solid ${cadenceInk[t.cadence]}`,
    textDecoration: t.done ? 'line-through' : 'none',
    textDecorationColor: cadenceInk[t.cadence],
    opacity: t.done ? 0.55 : 1,
    fontStyle: t.title ? 'normal' : 'italic',
  });

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={useWindow ? () => setWindowed(true) : undefined}
      title={
        useWindow
          ? `Open ${dayTasks.length} ${dayTasks.length === 1 ? 'task' : 'tasks'} for this day`
          : undefined
      }
      style={{
        background: isWeekend ? 'var(--bg)' : 'var(--bg-elev)',
        minHeight: isMobile ? 64 : 124,
        padding: isMobile ? '5px 4px 6px' : '8px 8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 2 : 4,
        position: 'relative',
        cursor: useWindow ? 'pointer' : 'default',
        outline: hover ? '1px solid var(--line-strong)' : '1px solid transparent',
        outlineOffset: -1,
        transition: 'outline-color 120ms ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 2,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: isMobile ? 10.5 : 11.5,
            color: isToday ? '#fff' : 'var(--ink-2)',
            background: isToday ? 'var(--accent)' : 'transparent',
            padding: isToday ? '2px 6px' : '2px 0',
            borderRadius: 999,
            fontWeight: isToday ? 600 : 400,
            letterSpacing: '0.02em',
          }}
        >
          {date.getDate()}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(date);
            }}
            title={`Add a task on ${date.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}`}
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--ink)',
              color: 'var(--bg)',
              opacity: hover ? 1 : 0,
              transform: hover ? 'scale(1)' : 'scale(0.85)',
              transition:
                'opacity 140ms ease, transform 140ms ease, background 140ms ease',
              pointerEvents: hover ? 'auto' : 'none',
              boxShadow: '0 4px 10px -3px rgba(20,16,10,0.25)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--ink)')}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>
      {isMobile
        ? dayTasks.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setWindowed(true);
              }}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 3,
                alignSelf: 'flex-start',
                padding: '2px 0',
                background: 'transparent',
                border: 0,
              }}
              title={`${dayTasks.length} ${dayTasks.length === 1 ? 'task' : 'tasks'}`}
            >
              {dayTasks.slice(0, 4).map((t) => (
                <span
                  key={t.id}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    flex: 'none',
                    background: cadenceInk[t.cadence],
                    opacity: t.done ? 0.4 : 1,
                  }}
                />
              ))}
              {dayTasks.length > 4 && (
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 8.5,
                    color: 'var(--ink-3)',
                    letterSpacing: '0.04em',
                    marginLeft: 2,
                  }}
                >
                  +{dayTasks.length - 4}
                </span>
              )}
            </button>
          )
        : visible.map((t) => (
            <button
              key={t.id}
              onClick={(e) => {
                e.stopPropagation();
                onOpen(t.id);
              }}
              title={t.title || 'Untitled'}
              style={chipStyle(t)}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 999,
                  flex: 'none',
                  background: t.priority === 'high' ? 'var(--accent)' : 'transparent',
                  border:
                    t.priority === 'high'
                      ? 'none'
                      : `1px solid ${cadenceInk[t.cadence]}`,
                  opacity: t.priority === 'low' ? 0.45 : 1,
                }}
              />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.title || 'untitled'}
              </span>
            </button>
          ))}
      {!isMobile && overflow > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setWindowed(true);
          }}
          style={{
            alignSelf: 'flex-start',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
            padding: '2px 6px',
            borderRadius: 4,
            transition: 'background 120ms ease, color 120ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-sunken)';
            e.currentTarget.style.color = 'var(--ink)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--ink-3)';
          }}
        >
          +{overflow} more
        </button>
      )}
      {windowed && (
        <DayModal
          date={date}
          isToday={isToday}
          dayTasks={dayTasks}
          cadenceTint={cadenceTint}
          cadenceInk={cadenceInk}
          onOpen={onOpen}
          onAdd={onAdd}
          onClose={() => setWindowed(false)}
        />
      )}
    </div>
  );
}
