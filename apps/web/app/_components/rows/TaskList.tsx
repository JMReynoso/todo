import { TaskRow } from './TaskRow';
import type { Task } from '../../_types';

export interface TaskListProps {
  tasks: Task[];
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  hairlines: boolean;
}

export function TaskList({ tasks, onOpen, onToggle, hairlines }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div
        style={{
          padding: '32px 0',
          textAlign: 'left',
          fontFamily: 'var(--display)',
          fontWeight: 400,
          fontSize: 18,
          color: 'var(--ink-3)',
          letterSpacing: '-0.015em',
        }}
      >
        nothing here. enjoy it, or add something below.
      </div>
    );
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {tasks.map((task, i) => (
        <TaskRow
          key={task.id}
          task={task}
          onOpen={onOpen}
          onToggle={onToggle}
          hairline={hairlines && i < tasks.length - 1}
        />
      ))}
    </ul>
  );
}
