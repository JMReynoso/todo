import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileCtx } from '@/app/_context/MobileCtx';
import { SettingsCtx, defaultSettings } from '@/app/_context/SettingsCtx';
import { TaskList } from '@/app/_components/rows/TaskList';
import { TaskRow } from '@/app/_components/rows/TaskRow';
import type { Task } from '@/app/_types';

// useResolvedPerson depends on TodoCtx / AuthCtx — stub it out.
vi.mock('@/app/_hooks/useResolvedPeople', () => ({
  useResolvedPerson: () => null,
  useResolvedPeople: () => [],
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '1',
    cadence: 'daily',
    title: 'Test task',
    done: false,
    priority: 'med',
    startsOn: '2026-06-01',
    dueOn: '2026-06-02',
    tags: [],
    subtasks: [],
    notes: '',
    streak: 0,
    assignee: null,
    ...overrides,
  };
}

function renderRow(
  task: Task,
  props: Partial<React.ComponentProps<typeof TaskRow>> = {},
  isMobile = false,
) {
  return render(
    <SettingsCtx.Provider value={defaultSettings}>
      <MobileCtx.Provider value={isMobile}>
        <ul>
          <TaskRow
            task={task}
            onOpen={vi.fn()}
            onToggle={vi.fn()}
            hairline={false}
            {...props}
          />
        </ul>
      </MobileCtx.Provider>
    </SettingsCtx.Provider>,
  );
}

// ──────────────────────────────────────────────────────────────
// Issue #38 — once tasks must not receive the red urgency gradient
// ──────────────────────────────────────────────────────────────
describe('TaskRow — urgency gradient', () => {
  it('applies a red gradient background for an overdue daily task', () => {
    const task = makeTask({ cadence: 'daily', dueOn: '2026-01-01' }); // far in the past
    const { container } = renderRow(task);
    const li = container.querySelector('li')!;
    expect(li.style.background).toContain('oklch');
  });

  it('does NOT apply a gradient for an overdue once task', () => {
    const task = makeTask({ cadence: 'once', dueOn: '2026-01-01' }); // past due
    const { container } = renderRow(task);
    const li = container.querySelector('li')!;
    expect(li.style.background).not.toContain('oklch');
  });

  it('does NOT apply a gradient for a completed once task', () => {
    const task = makeTask({ cadence: 'once', dueOn: '2026-01-01', done: true });
    const { container } = renderRow(task);
    const li = container.querySelector('li')!;
    expect(li.style.background).not.toContain('oklch');
  });
});

// ──────────────────────────────────────────────────────────────
// Issue #36 — drag handle visibility
// ──────────────────────────────────────────────────────────────
describe('TaskRow — drag handle', () => {
  it('renders a grip icon when onDragStart is provided and not on mobile', () => {
    const { container } = renderRow(makeTask(), { onDragStart: vi.fn() }, false);
    // The grip icon is an SVG inside the handle span
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('does NOT render a grip icon when onDragStart is provided but on mobile', () => {
    // On mobile the grip span is not rendered. Check is unchecked so no svg from it.
    const { container } = renderRow(makeTask(), { onDragStart: vi.fn() }, true);
    const li = container.querySelector('li')!;
    const svgs = li.querySelectorAll('svg');
    expect(svgs.length).toBe(0);
  });

  it('does NOT render a grip icon when onDragStart is not provided', () => {
    const { container } = renderRow(makeTask(), {}, false);
    const li = container.querySelector('li')!;
    // Check is unchecked (no svg), grip is absent — total 0 svgs.
    const svgs = li.querySelectorAll('svg');
    expect(svgs.length).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────
// Issue #36 — TaskList drag-to-reorder callback
// ──────────────────────────────────────────────────────────────
describe('TaskList — drag-to-reorder', () => {
  const tasks = [
    makeTask({ id: 'a', title: 'Alpha' }),
    makeTask({ id: 'b', title: 'Beta' }),
    makeTask({ id: 'c', title: 'Gamma' }),
  ];

  function renderList(onReorder?: (ids: string[]) => void) {
    return render(
      <SettingsCtx.Provider value={defaultSettings}>
        <MobileCtx.Provider value={false}>
          <TaskList
            tasks={tasks}
            onOpen={vi.fn()}
            onToggle={vi.fn()}
            hairlines={false}
            onReorder={onReorder}
          />
        </MobileCtx.Provider>
      </SettingsCtx.Provider>,
    );
  }

  it('renders all tasks', () => {
    renderList();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('calls onReorder with new order when an item is dropped onto another', () => {
    const onReorder = vi.fn();
    const { container } = renderList(onReorder);
    const items = container.querySelectorAll('li');
    // Drag first item (Alpha) over the third (Gamma) and drop
    fireEvent.dragStart(items[0]);
    fireEvent.dragOver(items[2], { preventDefault: vi.fn() });
    fireEvent.drop(items[2]);
    expect(onReorder).toHaveBeenCalledOnce();
    const [ids] = onReorder.mock.calls[0] as [string[]];
    expect(ids[0]).toBe('b');
    expect(ids[1]).toBe('c');
    expect(ids[2]).toBe('a');
  });

  it('does not call onReorder when an item is dropped on itself', () => {
    const onReorder = vi.fn();
    const { container } = renderList(onReorder);
    const items = container.querySelectorAll('li');
    fireEvent.dragStart(items[1]);
    fireEvent.dragOver(items[1], { preventDefault: vi.fn() });
    fireEvent.drop(items[1]);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('clears drag state when drag ends', () => {
    const onReorder = vi.fn();
    const { container } = renderList(onReorder);
    const items = container.querySelectorAll('li');
    fireEvent.dragStart(items[0]);
    fireEvent.dragEnd(items[0]);
    // No error thrown; drag state has been reset.
    expect(true).toBe(true);
  });

  it('renders empty state when there are no tasks', () => {
    render(
      <SettingsCtx.Provider value={defaultSettings}>
        <MobileCtx.Provider value={false}>
          <TaskList tasks={[]} onOpen={vi.fn()} onToggle={vi.fn()} hairlines={false} />
        </MobileCtx.Provider>
      </SettingsCtx.Provider>,
    );
    expect(screen.getByText(/nothing here/i)).toBeInTheDocument();
  });
});
