'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Composer } from '../composer/Composer';
import { useMobile } from '../../_context/MobileCtx';
import { CADENCES } from '../../_data/constants';
import { Progress } from '../atoms/Progress';
import { cadencePeriodLabel, nextResetLabel } from '../../_lib/dates';
import { TaskList } from '../rows/TaskList';
import type { Cadence, Task } from '../../_types';
import { ScheduledSection } from './ScheduledSection';

export interface StackedViewProps {
  tasks: Task[];
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onAdd: (cadence: Cadence) => void;
  query: string;
  hairlines: boolean;
}

interface SectionDef {
  id: string;
  label: string;
  note: string;
}

export function StackedView({
  tasks,
  onOpen,
  onToggle,
  onAdd,
  query,
  hairlines,
}: StackedViewProps) {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeAnchor, setActiveAnchor] = useState<string>('daily');
  const [mounted, setMounted] = useState(false);
  const isMobile = useMobile();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  const onceTasks = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            t.cadence === 'once' &&
            (!query || (t.title || '').toLowerCase().includes(query.toLowerCase())),
        )
        .sort((a, b) => String(a.startsOn).localeCompare(String(b.startsOn))),
    [tasks, query],
  );

  const sections = useMemo<SectionDef[]>(
    () => [{ id: 'scheduled', label: 'One-offs', note: 'one-time, not scored' }, ...CADENCES],
    [],
  );

  const counts = useMemo(() => {
    const m: Record<string, { total: number; done: number }> = {
      scheduled: {
        total: onceTasks.length,
        done: onceTasks.filter((t) => t.done).length,
      },
    };
    CADENCES.forEach((c) => {
      const xs = tasks.filter((t) => t.cadence === c.id);
      m[c.id] = { total: xs.length, done: xs.filter((t) => t.done).length };
    });
    return m;
  }, [tasks, onceTasks]);

  // Scrollspy: highlight whichever section's heading is nearest the top
  useEffect(() => {
    const onScroll = () => {
      const probe = window.scrollY + 200;
      let current = sections[0]?.id || 'daily';
      for (const s of sections) {
        const el = sectionRefs.current[s.id];
        if (el && el.offsetTop <= probe) current = s.id;
      }
      setActiveAnchor(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections]);

  const jumpTo = (id: string) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    window.scrollTo({ top: el.offsetTop - 110, behavior: 'smooth' });
  };

  return (
    <main
      style={{
        flex: 1,
        display: isMobile ? 'block' : 'grid',
        gridTemplateColumns: isMobile ? 'none' : '180px 1fr',
        gap: isMobile ? 0 : 64,
        maxWidth: 1160,
        width: '100%',
        margin: '0 auto',
        padding: isMobile ? '0 18px 80px' : '0 36px 120px',
      }}
    >
      {isMobile && (
        <nav
          style={{
            position: 'sticky',
            top: 56,
            background: 'var(--bg)',
            margin: '0 -18px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--line)',
            overflowX: 'auto',
            overflowY: 'hidden',
            display: 'flex',
            gap: 6,
            zIndex: 4,
            WebkitOverflowScrolling: 'touch',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-6px)',
            transition: 'opacity 400ms ease, transform 500ms ease',
          }}
        >
          {sections.map((s) => {
            const active = activeAnchor === s.id;
            const { total, done } = counts[s.id];
            return (
              <button
                key={s.id}
                onClick={() => jumpTo(s.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                  border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
                  background: active ? 'var(--ink)' : 'var(--bg-elev)',
                  color: active ? 'var(--bg)' : 'var(--ink-2)',
                  fontFamily: 'var(--display)',
                  fontWeight: 500,
                  fontSize: 14,
                  letterSpacing: '-0.01em',
                }}
              >
                <span>{s.label.toLowerCase()}</span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    color: active ? 'var(--bg)' : 'var(--ink-4)',
                    letterSpacing: '0.04em',
                    opacity: 0.7,
                  }}
                >
                  {done}/{total}
                </span>
              </button>
            );
          })}
        </nav>
      )}
      {!isMobile && (
        <aside
          style={{
            position: 'sticky',
            top: 96,
            alignSelf: 'start',
            paddingTop: 56,
            height: 'fit-content',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateX(0)' : 'translateX(-12px)',
            transition: 'opacity 500ms ease, transform 600ms cubic-bezier(.22,.61,.36,1)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-4)',
              marginBottom: 14,
            }}
          >
            jump to
          </div>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {sections.map((c) => {
              const active = activeAnchor === c.id;
              const { total, done } = counts[c.id];
              return (
                <li key={c.id}>
                  <button
                    onClick={() => jumpTo(c.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      padding: '6px 10px 6px 12px',
                      borderLeft: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                      marginLeft: -1.5,
                      color: active ? 'var(--ink)' : 'var(--ink-3)',
                      transition: 'border-color 160ms ease, color 160ms ease',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--display)',
                        fontWeight: active ? 600 : 400,
                        fontSize: 15,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {c.label.toLowerCase()}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 10,
                        color: 'var(--ink-4)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {done}/{total}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      )}

      <div style={{ paddingTop: isMobile ? 16 : 40 }}>
        <ScheduledSection
          sectionRef={(el) => {
            sectionRefs.current['scheduled'] = el;
          }}
          tasks={onceTasks}
          onOpen={onOpen}
          onToggle={onToggle}
          onAdd={onAdd}
          hairlines={hairlines}
          mounted={mounted}
        />
        {CADENCES.map((c, idx) => {
          const all = tasks.filter(
            (t) =>
              t.cadence === c.id &&
              (!query || t.title.toLowerCase().includes(query.toLowerCase())),
          );
          const open = all.filter((t) => !t.done);
          const doneList = all.filter((t) => t.done);
          return (
            <section
              key={c.id}
              ref={(el) => {
                sectionRefs.current[c.id] = el;
              }}
              style={{
                paddingBottom: 64,
                marginBottom: 64,
                borderBottom:
                  idx < CADENCES.length - 1 ? '1px solid var(--line)' : 'none',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                transition: `opacity 600ms ease ${80 + idx * 110}ms, transform 700ms cubic-bezier(.22,.61,.36,1) ${80 + idx * 110}ms`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  marginBottom: 28,
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
                    {String(idx + 1).padStart(2, '0')} — {c.note}
                    <span style={{ color: 'var(--ink-4)' }}>
                      {' '}
                      · {cadencePeriodLabel(c.id)}
                    </span>
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
                    {c.label.toLowerCase()}
                    <span style={{ color: 'var(--accent)' }}>.</span>
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
                    {open.length} open · {doneList.length} complete
                  </p>
                </div>
                <Progress done={doneList.length} total={all.length} />
              </div>

              <TaskList
                tasks={open}
                onOpen={onOpen}
                onToggle={onToggle}
                hairlines={hairlines}
              />

              <Composer cadence={c.id} onAdd={onAdd} />

              {doneList.length > 0 && (
                <details style={{ marginTop: 28 }}>
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontFamily: 'var(--mono)',
                      fontSize: 11,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-3)',
                      padding: '10px 0',
                      listStyle: 'none',
                      outline: 0,
                    }}
                  >
                    Completed · {doneList.length}
                    {nextResetLabel(c.id) && (
                      <span style={{ color: 'var(--ink-4)' }}>
                        {' '}
                        · resets {nextResetLabel(c.id)}
                      </span>
                    )}
                  </summary>
                  <div style={{ marginTop: 8, opacity: 0.78 }}>
                    <TaskList
                      tasks={doneList}
                      onOpen={onOpen}
                      onToggle={onToggle}
                      hairlines={hairlines}
                    />
                  </div>
                </details>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
