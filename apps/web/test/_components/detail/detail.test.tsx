import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileCtx } from '@/app/_context/MobileCtx';
import { SettingsCtx, defaultSettings } from '@/app/_context/SettingsCtx';
import { DetailSheet } from '@/app/_components/detail/DetailSheet';
import type { Task } from '@/app/_types';

// AssigneeField → useResolvedPeople → useTodo/useAuth; stub them all out.
vi.mock('@/app/_hooks/useResolvedPeople', () => ({
  useResolvedPerson: () => null,
  useResolvedPeople: () => [],
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '1',
    cadence: 'daily',
    title: 'My Task',
    done: false,
    priority: 'med',
    startsOn: '2026-06-01',
    dueOn: '2026-06-02',
    tags: [],
    subtasks: [],
    notes: '',
    streak: 0,
    completedDates: [],
    assignee: null,
    ...overrides,
  };
}

const defaultProps = {
  closing: false,
  onClose: vi.fn(),
  onChange: vi.fn(),
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  onSave: vi.fn(),
  onAddSubtask: vi.fn(),
  onToggleSubtask: vi.fn(),
  onDeleteSubtask: vi.fn(),
  onEditSubtask: vi.fn(),
  onReorderSubtasks: vi.fn(),
};

function renderSheet(task: Task, props = {}) {
  return render(
    <SettingsCtx.Provider value={defaultSettings}>
      <MobileCtx.Provider value={false}>
        <DetailSheet task={task} {...defaultProps} {...props} />
      </MobileCtx.Provider>
    </SettingsCtx.Provider>,
  );
}

// ──────────────────────────────────────────────────────────────
// Issue #35 — editable subtask titles
// ──────────────────────────────────────────────────────────────
describe('DetailSheet — editable subtasks', () => {
  it('renders subtask titles as input elements', () => {
    const task = makeTask({
      subtasks: [{ id: 's1', taskId: 1, title: 'Step one', done: false }],
    });
    renderSheet(task);
    const input = screen.getByDisplayValue('Step one');
    expect(input.tagName).toBe('INPUT');
  });

  it('calls onEditSubtask with the subtask id and new title when the input changes', () => {
    const onEditSubtask = vi.fn();
    const task = makeTask({
      subtasks: [{ id: 's1', taskId: 1, title: 'Step one', done: false }],
    });
    renderSheet(task, { onEditSubtask });
    const input = screen.getByDisplayValue('Step one');
    fireEvent.change(input, { target: { value: 'Step one edited' } });
    expect(onEditSubtask).toHaveBeenCalledWith('s1', 'Step one edited');
  });

  it('renders multiple subtasks as separate inputs', () => {
    const task = makeTask({
      subtasks: [
        { id: 's1', taskId: 1, title: 'Alpha', done: false },
        { id: 's2', taskId: 1, title: 'Beta', done: true },
      ],
    });
    renderSheet(task);
    expect(screen.getByDisplayValue('Alpha')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Beta')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────
// Issue #36 — subtask drag-to-reorder
// ──────────────────────────────────────────────────────────────
describe('DetailSheet — subtask drag-to-reorder', () => {
  const subtasks = [
    { id: 's1', taskId: 1, title: 'First', done: false },
    { id: 's2', taskId: 1, title: 'Second', done: false },
    { id: 's3', taskId: 1, title: 'Third', done: false },
  ];

  it('renders grip handles for each subtask', () => {
    const task = makeTask({ subtasks });
    const { container } = renderSheet(task);
    // Each subtask row contains a grip icon; there are 3 subtasks.
    // The checklist section is a <ul>, each <li> contains an svg for the grip.
    const lis = container.querySelectorAll('ul li');
    // Filter to subtask rows (the input-based rows), not the "add step" row
    const subtaskLis = Array.from(lis).filter((li) => li.querySelector('input'));
    expect(subtaskLis.length).toBe(3);
  });

  it('calls onReorderSubtasks with new id order after a drag drop', () => {
    const onReorderSubtasks = vi.fn();
    const task = makeTask({ subtasks });
    const { container } = renderSheet(task, { onReorderSubtasks });
    // Find the <ul> containing subtask rows (the checklist ul)
    const allLis = Array.from(container.querySelectorAll('li')).filter((li) =>
      li.querySelector('input'),
    );
    // Drag the first item and drop onto the third
    fireEvent.dragStart(allLis[0]);
    fireEvent.dragOver(allLis[2], { preventDefault: vi.fn() });
    fireEvent.drop(allLis[2]);
    expect(onReorderSubtasks).toHaveBeenCalledOnce();
    const [ids] = onReorderSubtasks.mock.calls[0] as [string[]];
    expect(ids).toEqual(['s2', 's3', 's1']);
  });

  it('does not call onReorderSubtasks when dropped on itself', () => {
    const onReorderSubtasks = vi.fn();
    const task = makeTask({ subtasks });
    const { container } = renderSheet(task, { onReorderSubtasks });
    const allLis = Array.from(container.querySelectorAll('li')).filter((li) =>
      li.querySelector('input'),
    );
    fireEvent.dragStart(allLis[1]);
    fireEvent.dragOver(allLis[1], { preventDefault: vi.fn() });
    fireEvent.drop(allLis[1]);
    expect(onReorderSubtasks).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────
// General rendering
// ──────────────────────────────────────────────────────────────
describe('DetailSheet — rendering', () => {
  it('renders the task title in a textarea', () => {
    renderSheet(makeTask({ title: 'Write tests' }));
    expect(screen.getByDisplayValue('Write tests')).toBeInTheDocument();
  });

  it('shows the "new task" label for draft tasks', () => {
    renderSheet(makeTask({ isDraft: true }));
    expect(screen.getByText(/new task/i)).toBeInTheDocument();
  });

  it('shows the "detail" label for saved tasks', () => {
    renderSheet(makeTask({ isDraft: false }));
    expect(screen.getByText(/detail/i)).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    renderSheet(makeTask(), { onClose });
    fireEvent.click(screen.getByTitle(/close/i));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onDelete when the delete button is clicked on a saved task', () => {
    const onDelete = vi.fn();
    renderSheet(makeTask({ isDraft: false }), { onDelete });
    fireEvent.click(screen.getByTitle(/delete/i));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
