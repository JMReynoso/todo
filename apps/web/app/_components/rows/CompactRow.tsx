import { Check } from '../atoms/Check';
import { PriorityDot } from '../atoms/PriorityDot';
import type { Task } from '../../_types';

export interface CompactRowProps {
  task: Task;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  hairlines: boolean;
  last: boolean;
  muted?: boolean;
}

export function CompactRow({
  task,
  onOpen,
  onToggle,
  hairlines,
  last,
  muted,
}: CompactRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 2px',
        borderBottom: hairlines && !last ? '1px solid var(--line)' : 'none',
        opacity: muted ? 0.55 : 1,
      }}
    >
      <Check checked={task.done} onChange={() => onToggle(task.id)} size={16} />
      <button
        onClick={() => onOpen(task.id)}
        style={{
          flex: 1,
          textAlign: 'left',
          fontSize: 13.5,
          color: task.done ? 'var(--ink-3)' : 'var(--ink)',
          textDecoration: task.done ? 'line-through' : 'none',
          textDecorationColor: 'var(--ink-4)',
          lineHeight: 1.35,
        }}
      >
        {task.title}
      </button>
      <PriorityDot priority={task.priority} />
    </div>
  );
}
