'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useMobile } from '../../_context/MobileCtx';
import { useDismissable } from '../../_hooks/useDismissable';
import { isCompletedOn } from '../../_lib/dates';
import modal from '../modal.module.css';
import type { Task } from '../../_types';
import type { CadenceColorMap } from './DayCell';

export interface DayModalProps {
  date: Date;
  isToday: boolean;
  dayTasks: Task[];
  cadenceTint: CadenceColorMap;
  cadenceInk: CadenceColorMap;
  onOpen: (id: string) => void;
  onAdd: (date: Date) => void;
  onClose: () => void;
}

/**
 * A centered "window view" of a single day, listing every task for that day.
 * The in-cell calendar chips get cramped once a day has many tasks, so cells
 * with 5+ tasks open this instead of the tiny in-cell popover.
 */
export function DayModal({
  date,
  isToday,
  dayTasks,
  cadenceTint,
  cadenceInk,
  onOpen,
  onAdd,
  onClose,
}: DayModalProps) {
  const isMobile = useMobile();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);
  useDismissable(true, dialogRef, onClose);

  const rowStyle = (t: Task): CSSProperties => {
    const doneOnDay = isCompletedOn(t, date);
    return {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 12px',
      borderRadius: 8,
      background: cadenceTint[t.cadence],
      color: cadenceInk[t.cadence],
      fontSize: 13.5,
      lineHeight: 1.35,
      textAlign: 'left',
      borderLeft: `2px solid ${cadenceInk[t.cadence]}`,
      textDecoration: doneOnDay ? 'line-through' : 'none',
      textDecorationColor: cadenceInk[t.cadence],
      opacity: doneOnDay ? 0.55 : 1,
      width: '100%',
    };
  };

  // The calendar grid is transformed (for its mount animation), which would clip
  // a position:fixed child — so portal out to the body to overlay the viewport.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={`${modal.scrim} ${mounted ? modal.scrimShown : ''}`}
        style={{ opacity: mounted ? 1 : 0 }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${modal.frame} ${isMobile ? modal.frameMobile : ''}`}
        style={{ pointerEvents: mounted ? 'auto' : 'none' }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          className={`${modal.dialog} ${mounted ? modal.dialogShown : ''} ${
            isMobile ? modal.dialogMobile : ''
          }`}
          style={{
            width: isMobile ? '100%' : 'min(460px, 100%)',
            opacity: mounted ? 1 : 0,
            transform: mounted
              ? 'scale(1) translateY(0)'
              : isMobile
                ? 'translateY(20px)'
                : 'scale(0.97) translateY(8px)',
          }}
        >
          <div
            style={{
              padding: '18px 22px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 500,
                  fontSize: 26,
                  letterSpacing: '-0.03em',
                  color: 'var(--ink)',
                }}
              >
                {date.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              {isToday && (
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    color: '#fff',
                    background: 'var(--accent)',
                    padding: '2px 7px',
                    borderRadius: 999,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  today
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => {
                  onClose();
                  onAdd(date);
                }}
                title="Add a task on this day"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--ink)',
                  color: 'var(--bg)',
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button
                onClick={onClose}
                title="Close"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink-3)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-sunken)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>

          <div
            style={{
              padding: '14px 18px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10.5,
                color: 'var(--ink-3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
            </div>
            {dayTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onClose();
                  onOpen(t.id);
                }}
                title={t.title || 'untitled'}
                style={rowStyle(t)}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    flex: 'none',
                    background:
                      t.priority === 'high' ? 'var(--accent)' : 'transparent',
                    border:
                      t.priority === 'high'
                        ? 'none'
                        : `1px solid ${cadenceInk[t.cadence]}`,
                    opacity: t.priority === 'low' ? 0.45 : 1,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontStyle: t.title ? 'normal' : 'italic',
                  }}
                >
                  {t.title || 'untitled'}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 9.5,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    opacity: 0.7,
                    flex: 'none',
                  }}
                >
                  {t.cadence}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
