'use client';

import { CalendarView } from './_components/views/CalendarView';
import { StackedView } from './_components/views/StackedView';
import { useTodo } from './_context/TodoCtx';

export default function HomePage() {
  const {
    tasks,
    tweaks,
    query,
    setOpenId,
    toggleTask,
    createDraftFor,
    createOnDate,
  } = useTodo();

  if (tweaks.layout === 'calendar') {
    return (
      <CalendarView
        tasks={tasks}
        onOpen={setOpenId}
        onToggle={toggleTask}
        onCreateOnDate={createOnDate}
        query={query}
      />
    );
  }

  return (
    <StackedView
      tasks={tasks}
      onOpen={setOpenId}
      onToggle={toggleTask}
      onAdd={createDraftFor}
      query={query}
      hairlines={tweaks.showHairlines}
    />
  );
}
