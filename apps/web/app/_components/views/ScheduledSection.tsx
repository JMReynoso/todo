'use client';

import { useMemo, type Ref } from 'react';
import { useMobile } from '../../_context/MobileCtx';
import { Composer } from '../composer/Composer';
import { TaskList } from '../rows/TaskList';
import type { Cadence, Task } from '../../_types';

export interface ScheduledSectionProps {
  sectionRef: Ref<HTMLElement>;
  tasks: Task[];
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onAdd: (cadence: Cadence) => void;
  hairlines: boolean;
  mounted: boolean;
}

export function ScheduledSection({
  sectionRef,
  tasks,
  onOpen,
  onToggle,
  onAdd,
  hairlines,
  mounted,
}: ScheduledSectionProps) {
  const isMobile = useMobile();
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const groups = useMemo<[string, Task[]][]>(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      // "~" sorts after ISO dates so undated appears last in calendar context
      const k = t.date || '~';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return [...m.entries()].sort((a, b) => {
      if (a[0] === '~' && b[0] !== '~') return -1;
      if (a[0] !== '~' && b[0] === '~') return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [tasks]);
  return (
    <section
      ref={sectionRef}
      style={{
        paddingBottom: 64,
        marginBottom: 64,
        borderBottom: '1px solid var(--line)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 600ms ease 60ms, transform 700ms cubic-bezier(.22,.61,.36,1) 60ms',
      }}
    >
      <div style={{ marginBottom: 28 }}>
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
          00 — one-time, not scored
        </div>
        <h2
          style={{
            fontFamily: 'var(--display)',
            fontWeight: 500,
            fontSize: isMobile ? 44 : 64,
            lineHeight: 0.95,
            margin: 0,
            color: 'var(--ink)',
            letterSpacing: '-0.04em',
          }}
        >
          one-offs<span style={{ color: 'var(--accent)' }}>.</span>
        </h2>
        <p
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11.5,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginTop: 12,
            marginBottom: 0,
          }}
        >
          {open.length} open · {done.length} complete · doesn&apos;t count toward your score
        </p>
      </div>
      {groups.length === 0 && (
        <div
          style={{
            padding: '12px 0 0',
            fontFamily: 'var(--display)',
            fontWeight: 400,
            fontSize: 17,
            color: 'var(--ink-3)',
            letterSpacing: '-0.015em',
          }}
        >
          nothing one-off yet. add something below — no date needed.
        </div>
      )}
      {groups.map(([dateKey, items]) => {
        const d = new Date(dateKey + 'T00:00:00');
        const label =
          dateKey === '~' || isNaN(d.getTime())
            ? 'anytime'
            : d.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              });
        return (
          <div key={dateKey} style={{ marginBottom: 14 }}>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10.5,
                color: 'var(--ink-3)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '10px 4px 4px',
              }}
            >
              {label}
            </div>
            <TaskList tasks={items} onOpen={onOpen} onToggle={onToggle} hairlines={hairlines} />
          </div>
        );
      })}
      <Composer cadence="once" onAdd={onAdd} />
    </section>
  );
}
