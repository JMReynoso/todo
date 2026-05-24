import type { Priority } from '../../_types';

export interface PriorityDotProps {
  priority: Priority;
}

export function PriorityDot({ priority }: PriorityDotProps) {
  const c =
    priority === 'high'
      ? 'var(--accent)'
      : priority === 'med'
        ? 'var(--ink-3)'
        : 'var(--ink-4)';
  return (
    <span
      style={{ width: 6, height: 6, borderRadius: 999, background: c, flex: 'none' }}
    />
  );
}
