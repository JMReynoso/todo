'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { Check } from '../atoms/Check';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { useMobile } from '../../_context/MobileCtx';
import { useSettings } from '../../_context/SettingsCtx';
import { CADENCES } from '../../_data/constants';
import modal from '../modal.module.css';
import type { Cadence, PersonId, Priority, Task } from '../../_types';
import { formatIso, nextDueOn } from '../../_lib/dates';
import { AssigneeField } from './AssigneeField';
import { MetaLabel } from './MetaLabel';
import { SectionHead } from './SectionHead';
import { StartsOnField } from './StartsOnField';
import { TagEditor } from './TagEditor';
import { TypeField } from './TypeField';

export interface DetailSheetProps {
  task: Task;
  closing: boolean;
  onClose: () => void;
  onChange: (patch: Partial<Task>) => void;
  onToggle: () => void;
  onDelete: () => void;
  onSave: () => void;
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
}

const PRIORITIES: Priority[] = ['low', 'med', 'high'];

export function DetailSheet({
  task,
  closing,
  onClose,
  onChange,
  onToggle,
  onDelete,
  onSave,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: DetailSheetProps) {
  const { scoring } = useSettings();
  const isMobile = useMobile();
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);
  const shown = mounted && !closing;

  const addSub = (title: string) => {
    if (!title.trim()) return;
    onAddSubtask(title.trim());
  };
  const toggleSub = (id: string) => onToggleSubtask(id);
  const delSub = (id: string) => onDeleteSubtask(id);

  const [newSub, setNewSub] = useState('');

  // Trigger focus on draft titles once the dialog has animated in.
  useEffect(() => {
    if (!task.title && shown) {
      const el = document.querySelector<HTMLTextAreaElement>(
        '[data-detail-title]',
      );
      if (el) el.focus();
    }
  }, [task.title, shown]);

  return (
    <>
      <div
        onClick={onClose}
        className={`${modal.scrim} ${shown ? modal.scrimShown : ''}`}
        style={{ opacity: shown ? 1 : 0 }}
      />
      <div
        onClick={onClose}
        className={`${modal.frame} ${isMobile ? modal.frameMobile : ''}`}
        style={{ pointerEvents: shown ? 'auto' : 'none' }}
      >
        <aside
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          className={`${modal.dialog} ${shown ? modal.dialogShown : ''} ${
            isMobile ? modal.dialogMobile : ''
          }`}
          style={{
            opacity: shown ? 1 : 0,
            transform: shown
              ? 'scale(1) translateY(0)'
              : isMobile
                ? 'translateY(20px)'
                : 'scale(0.97) translateY(8px)',
          }}
        >
          <div
            style={{
              padding: '20px 28px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Pill tone="accent">
                {task.cadence === 'once'
                  ? formatIso(task.startsOn)
                    ? `on ${formatIso(task.startsOn).toLowerCase()}`
                    : 'one-off'
                  : CADENCES.find((c) => c.id === task.cadence)?.label.toLowerCase() ||
                    'task'}
              </Pill>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10.5,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {task.isDraft ? 'new task' : 'detail'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {!task.isDraft && (
                <button
                  onClick={onDelete}
                  title="Delete"
                  style={{ padding: 8, borderRadius: 8, color: 'var(--ink-3)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--bg-sunken)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <Icon name="trash" size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                title="Close (Esc)"
                style={{ padding: 8, borderRadius: 8, color: 'var(--ink-2)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--bg-sunken)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '28px 28px 80px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div style={{ paddingTop: 8 }}>
                <Check checked={task.done} onChange={onToggle} size={22} />
              </div>
              <textarea
                data-detail-title
                value={task.title}
                onChange={(e) => onChange({ title: e.target.value })}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.shiftKey &&
                    task.isDraft &&
                    task.title.trim()
                  ) {
                    e.preventDefault();
                    onSave();
                  }
                }}
                placeholder="what's this task?"
                rows={1}
                style={{
                  flex: 1,
                  fontFamily: 'var(--display)',
                  fontWeight: 500,
                  fontSize: 32,
                  lineHeight: 1.15,
                  letterSpacing: '-0.035em',
                  color: task.done ? 'var(--ink-3)' : 'var(--ink)',
                  textDecoration: task.done ? 'line-through' : 'none',
                  textDecorationThickness: '1.5px',
                  resize: 'none',
                  padding: 0,
                  width: '100%',
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '12px 16px',
                padding: '16px 0',
                borderTop: '1px solid var(--line)',
                borderBottom: '1px solid var(--line)',
                marginBottom: 24,
              }}
            >
              <MetaLabel icon="calendar">Starts on</MetaLabel>
              <StartsOnField
                value={task.startsOn}
                onChange={(v) =>
                  onChange({ startsOn: v, dueOn: nextDueOn(v, task.cadence) })
                }
              />

              <MetaLabel icon="calendar">Due on</MetaLabel>
              {/* Derived from Starts on + cadence; locked (read-only). */}
              <span
                title="Calculated from Starts on and Type"
                style={{
                  fontSize: 14,
                  color: task.dueOn ? 'var(--ink-2)' : 'var(--ink-4)',
                  alignSelf: 'center',
                }}
              >
                {formatIso(task.dueOn) || '—'}
              </span>

              <MetaLabel>Type</MetaLabel>
              <TypeField
                value={task.cadence}
                onChange={(v: Cadence) =>
                  onChange({ cadence: v, dueOn: nextDueOn(task.startsOn, v) })
                }
              />

              <MetaLabel icon="user">Assignee</MetaLabel>
              <AssigneeField
                value={task.assignee}
                onChange={(v: PersonId | null) => onChange({ assignee: v })}
              />

              <MetaLabel icon="flame">Streak</MetaLabel>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'var(--mono)',
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    color:
                      task.streak >= scoring.streakThreshold
                        ? 'var(--accent-ink)'
                        : 'var(--ink-2)',
                  }}
                >
                  {task.streak > 0 ? `${task.streak} in a row` : '—'}
                </span>
                {task.streak >= 7 && (
                  <span style={{ color: 'var(--ink-4)' }}>· strong</span>
                )}
              </div>

              <MetaLabel>Priority</MetaLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => onChange({ priority: p })}
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 11,
                      letterSpacing: '0.04em',
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: `0.75px solid ${
                        task.priority === p ? 'var(--accent)' : 'var(--line)'
                      }`,
                      background:
                        task.priority === p ? 'var(--accent-soft)' : 'transparent',
                      color:
                        task.priority === p ? 'var(--accent-ink)' : 'var(--ink-2)',
                      textTransform: 'lowercase',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <MetaLabel icon="tag">Tags</MetaLabel>
              <TagEditor
                tags={task.tags}
                onChange={(tags) => onChange({ tags })}
              />
            </div>

            <SectionHead>Notes</SectionHead>
            <textarea
              value={task.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="what does done look like? any context?"
              rows={3}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'var(--bg-elev)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                fontSize: 14,
                lineHeight: 1.55,
                color: 'var(--ink)',
                resize: 'vertical',
                minHeight: 80,
                marginBottom: 28,
              }}
            />

            <SectionHead>
              Checklist
              <span style={{ marginLeft: 8, color: 'var(--ink-4)' }}>
                {task.subtasks.length > 0 &&
                  `${task.subtasks.filter((s) => s.done).length}/${task.subtasks.length}`}
              </span>
            </SectionHead>
            <ul style={{ listStyle: 'none', margin: '0 0 8px', padding: 0 }}>
              {task.subtasks.map((s) => (
                <li
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '6px 0',
                  }}
                >
                  <Check
                    checked={s.done}
                    onChange={() => toggleSub(s.id)}
                    size={15}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: s.done ? 'var(--ink-3)' : 'var(--ink-2)',
                      textDecoration: s.done ? 'line-through' : 'none',
                      textDecorationColor: 'var(--ink-4)',
                    }}
                  >
                    {s.title}
                  </span>
                  <button
                    onClick={() => delSub(s.id)}
                    style={{ color: 'var(--ink-4)', opacity: 0.7 }}
                  >
                    <Icon name="close" size={12} />
                  </button>
                </li>
              ))}
            </ul>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 0',
              }}
            >
              <div
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: 4,
                  border: '1.25px dashed var(--line-strong)',
                }}
              />
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addSub(newSub);
                    setNewSub('');
                  }
                }}
                placeholder="add a step"
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: 'var(--ink-2)',
                  padding: '2px 0',
                }}
              />
            </div>

            <div
              style={{
                marginTop: 36,
                paddingTop: 18,
                borderTop: '1px solid var(--line)',
                display: 'flex',
                gap: 10,
              }}
            >
              {task.isDraft ? (
                <>
                  <button
                    onClick={onSave}
                    disabled={!task.title.trim()}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 999,
                      background: task.title.trim() ? 'var(--accent)' : 'var(--line)',
                      color: task.title.trim() ? '#fff' : 'var(--ink-4)',
                      border: '1px solid transparent',
                      fontSize: 13.5,
                      fontWeight: 500,
                      letterSpacing: '-0.005em',
                      cursor: task.title.trim() ? 'pointer' : 'not-allowed',
                      transition: 'background 140ms ease',
                    }}
                  >
                    {task.title.trim()
                      ? `Save${formatIso(task.startsOn) ? ` for ${formatIso(task.startsOn)}` : ''}`
                      : 'Add a title to save'}
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      padding: '12px 18px',
                      borderRadius: 999,
                      border: '1px solid var(--line)',
                      color: 'var(--ink-2)',
                      fontSize: 13.5,
                    }}
                  >
                    Discard
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onToggle}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 999,
                      background: task.done ? 'transparent' : 'var(--ink)',
                      color: task.done ? 'var(--ink-2)' : 'var(--bg)',
                      border: task.done
                        ? '1px solid var(--line-strong)'
                        : '1px solid var(--ink)',
                      fontSize: 13.5,
                      fontWeight: 500,
                      letterSpacing: '-0.005em',
                      transition: 'background 140ms ease',
                    }}
                  >
                    {task.done ? 'Mark not done' : 'Mark complete'}
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      padding: '12px 18px',
                      borderRadius: 999,
                      border: '1px solid var(--line)',
                      color: 'var(--ink-2)',
                      fontSize: 13.5,
                    }}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
