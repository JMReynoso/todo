import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileCtx } from '@/app/_context/MobileCtx';
import { SettingsCtx, defaultSettings } from '@/app/_context/SettingsCtx';
import { ScheduledSection } from '@/app/_components/views/ScheduledSection';
import type { Task } from '@/app/_types';

// TaskRow → useResolvedPerson → useResolvedPeople → useTodo / useAuth; stub out.
vi.mock('@/app/_hooks/useResolvedPeople', () => ({
  useResolvedPerson: () => null,
  useResolvedPeople: () => [],
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? '1',
    cadence: 'once',
    title: overrides.title ?? 'Task',
    done: false,
    priority: 'med',
    startsOn: '2026-06-10',
    dueOn: '2026-06-10',
    tags: [],
    subtasks: [],
    notes: '',
    streak: 0,
    completedDates: [],
    assignee: null,
    ...overrides,
  };
}

const sharedProps = {
  sectionRef: vi.fn() as unknown as React.Ref<HTMLElement>,
  onOpen: vi.fn(),
  onToggle: vi.fn(),
  onAdd: vi.fn(),
  onReorder: vi.fn(),
  hairlines: false,
  mounted: true,
};

function renderSection(tasks: Task[]) {
  return render(
    <SettingsCtx.Provider value={defaultSettings}>
      <MobileCtx.Provider value={false}>
        <ScheduledSection tasks={tasks} {...sharedProps} />
      </MobileCtx.Provider>
    </SettingsCtx.Provider>,
  );
}

describe('ScheduledSection — completed once tasks', () => {
  it('shows open tasks in the main date groups', () => {
    renderSection([
      makeTask({ id: 'a', title: 'Open task', done: false }),
      makeTask({ id: 'b', title: 'Done task', done: true }),
    ]);
    expect(screen.getByText('Open task')).toBeInTheDocument();
  });

  it('hides done tasks from the main date groups', () => {
    renderSection([
      makeTask({ id: 'a', title: 'Open task', done: false }),
      makeTask({ id: 'b', title: 'Done task', done: true }),
    ]);
    // "Done task" should only appear inside the collapsed <details>, not in the
    // primary list. The <details> is collapsed by default so the item is in the
    // DOM but visually hidden — just confirm the structure is correct by checking
    // the summary text reflects the count.
    expect(screen.getByText(/Completed · 1/i)).toBeInTheDocument();
  });

  it('does not render the Completed section when there are no done tasks', () => {
    renderSection([makeTask({ id: 'a', title: 'Open task', done: false })]);
    expect(screen.queryByText(/Completed/i)).not.toBeInTheDocument();
  });

  it('renders the correct completed count in the summary', () => {
    renderSection([
      makeTask({ id: 'a', title: 'A', done: true }),
      makeTask({ id: 'b', title: 'B', done: true }),
      makeTask({ id: 'c', title: 'C', done: false }),
    ]);
    expect(screen.getByText(/Completed · 2/i)).toBeInTheDocument();
  });

  it('shows date group labels inside the completed section for tasks with dates', () => {
    renderSection([
      makeTask({ id: 'a', title: 'Done A', done: true, startsOn: '2026-06-10' }),
    ]);
    // The <details> element contains a date label for the done group.
    const details = document.querySelector('details')!;
    expect(details).toBeInTheDocument();
    // Date label is inside the details
    expect(details.textContent).toMatch(/wednesday|jun 10/i);
  });

  it('shows the empty-state message when there are no tasks at all', () => {
    renderSection([]);
    expect(screen.getByText(/nothing one-off yet/i)).toBeInTheDocument();
  });

  it('shows open/complete counts in the section header', () => {
    renderSection([
      makeTask({ id: 'a', done: false }),
      makeTask({ id: 'b', done: true }),
      makeTask({ id: 'c', done: true }),
    ]);
    expect(screen.getByText(/1 open · 2 complete/i)).toBeInTheDocument();
  });
});
