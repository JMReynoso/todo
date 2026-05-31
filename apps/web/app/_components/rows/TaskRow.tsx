'use client';

import { useState } from 'react';
import { Avatar } from '../atoms/Avatar';
import { Check } from '../atoms/Check';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { PriorityDot } from '../atoms/PriorityDot';
import { useSettings } from '../../_context/SettingsCtx';
import { useResolvedPerson } from '../../_hooks/useResolvedPeople';
import { formatIso, nextResetLabel, taskUrgency } from '../../_lib/dates';
import type { Task } from '../../_types';

export interface TaskRowProps {
  task: Task;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  hairline: boolean;
}

export function TaskRow({ task, onOpen, onToggle, hairline }: TaskRowProps) {
  const [hover, setHover] = useState(false);
  const { scoring } = useSettings();
  const streakThreshold = scoring.streakThreshold ?? 3;
  const resolvedAssignee = useResolvedPerson(task.assignee);
  const urgency = taskUrgency(task);
  const urgentBg =
    urgency > 0
      ? `linear-gradient(90deg, oklch(0.97 0.025 25 / ${0.35 + urgency * 0.25}), oklch(0.88 0.14 25 / ${0.30 + urgency * 0.55}))`
      : null;
  return (
    <li
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        minHeight: 'var(--row-h)',
        padding: '8px 4px',
        borderBottom: hairline ? '1px solid var(--line)' : '1px solid transparent',
        transition: 'background 140ms ease',
        background: urgentBg || (hover ? 'rgba(0,0,0,0.012)' : 'transparent'),
        marginLeft: -4,
        marginRight: -4,
        paddingLeft: 4,
        paddingRight: 4,
        borderRadius: 4,
      }}
    >
      <Check checked={task.done} onChange={() => onToggle(task.id)} />
      <button
        onClick={() => onOpen(task.id)}
        style={{
          flex: 1,
          textAlign: 'left',
          padding: '4px 0',
          fontSize: 15.5,
          color: task.done ? 'var(--ink-3)' : 'var(--ink)',
          textDecoration: task.done ? 'line-through' : 'none',
          textDecorationColor: 'var(--ink-4)',
          transition: 'color 160ms ease, text-decoration 160ms ease',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            fontStyle: task.title ? 'normal' : 'italic',
            color: task.title ? undefined : 'var(--ink-4)',
          }}
        >
          {task.title || 'untitled'}
        </span>
        {task.subtasks.length > 0 && (
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10.5,
              color: 'var(--ink-3)',
              background: 'var(--bg-sunken)',
              padding: '1.5px 6px',
              borderRadius: 4,
            }}
          >
            {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
          </span>
        )}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {task.assignee && <Avatar person={resolvedAssignee} size={22} />}
        {task.streak >= streakThreshold && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              color: 'var(--accent-ink)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
            }}
          >
            <Icon name="flame" size={11.5} color="var(--accent)" stroke={1.8} />
            {task.streak}
          </span>
        )}
        {task.tags.map((tag) => (
          <Pill key={tag} tone="neutral">
            {tag}
          </Pill>
        ))}
        {task.done && task.cadence !== 'once' && nextResetLabel(task.cadence) ? (
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-3)',
              letterSpacing: '0.02em',
              fontStyle: 'italic',
            }}
          >
            resets {nextResetLabel(task.cadence)}
          </span>
        ) : (
          formatIso(task.dueOn) && (
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: task.priority === 'high' ? 'var(--accent-ink)' : 'var(--ink-3)',
                letterSpacing: '0.02em',
              }}
            >
              {formatIso(task.dueOn)}
            </span>
          )
        )}
        <PriorityDot priority={task.priority} />
      </div>
    </li>
  );
}
