import { useState } from 'react';
import { TaskRow } from './TaskRow';
import type { Task } from '../../_types';

export interface TaskListProps {
  tasks: Task[];
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  hairlines: boolean;
  onReorder?: (orderedIds: string[]) => void;
}

export function TaskList({ tasks, onOpen, onToggle, hairlines, onReorder }: TaskListProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx || !onReorder) return;
    const reordered = [...tasks];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    onReorder(reordered.map((t) => t.id));
    setDragIdx(null);
    setOverIdx(null);
  };

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
          isDragOver={overIdx === i}
          onDragStart={onReorder ? () => setDragIdx(i) : undefined}
          onDragOver={
            onReorder
              ? (e) => {
                  e.preventDefault();
                  setOverIdx(i);
                }
              : undefined
          }
          onDrop={onReorder ? () => handleDrop(i) : undefined}
          onDragEnd={
            onReorder
              ? () => {
                  setDragIdx(null);
                  setOverIdx(null);
                }
              : undefined
          }
        />
      ))}
    </ul>
  );
}
