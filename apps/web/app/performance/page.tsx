"use client";

import { useMemo, useState } from "react";
import { CalculatingScore } from "../_components/views/CalculatingScore";
import { PerformanceGraphs } from "../_components/views/PerformanceGraphs";
import { ScoreReveal } from "../_components/views/ScoreReveal";
import { useMobile } from "../_context/MobileCtx";
import { useSettings } from "../_context/SettingsCtx";
import { useTodo } from "../_context/TodoCtx";
import { tasksOnDate } from "../_lib/dates";
import { buildHistory } from "../_lib/history";
import type { Task } from "../_types";

type Phase = "calculatingScore" | "score" | "graphs";

export default function PerformanceRoute() {
  const { tasks } = useTodo();
  const { scoring } = useSettings();
  const isMobile = useMobile();
  const [phase, setPhase] = useState<Phase>("calculatingScore");

  const counts = (t: Task): boolean => {
    if (t.cadence === "once") return scoring.includeOnce;
    if (t.cadence === "daily") return scoring.includeDaily;
    if (t.cadence === "weekly") return scoring.includeWeekly;
    if (t.cadence === "monthly") return scoring.includeMonthly;
    return scoring.includeQuarterly;
  };

  const todayTasks = useMemo(
    () => tasksOnDate(tasks, new Date()).filter(counts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      tasks,
      scoring.includeDaily,
      scoring.includeWeekly,
      scoring.includeMonthly,
      scoring.includeQuarterly,
      scoring.includeOnce,
    ],
  );
  const doneToday = todayTasks.filter((t) => t.done).length;
  const totalToday = todayTasks.length;
  const score =
    totalToday === 0 ? 0 : Math.round((doneToday / totalToday) * 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const history = useMemo(() => buildHistory(tasks), []);

  return (
    <main
      style={{
        flex: 1,
        padding: isMobile ? "0 18px 60px" : "0 36px 80px",
        maxWidth: 1100,
        width: "100%",
        margin: "0 auto",
      }}
    >
      {phase === "calculatingScore" ? (
        <CalculatingScore />
      ) : phase === "score" ? (
        <ScoreReveal
          key="score"
          score={score}
          doneToday={doneToday}
          totalToday={totalToday}
          onNext={() => setPhase("graphs")}
        />
      ) : (
        <PerformanceGraphs
          key="graphs"
          history={history}
          score={score}
          doneToday={doneToday}
          totalToday={totalToday}
        />
      )}
    </main>
  );
}
