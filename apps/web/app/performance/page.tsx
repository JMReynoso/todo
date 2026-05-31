"use client";

import { useEffect, useMemo, useState } from "react";
import { CalculatingScore } from "../_components/views/CalculatingScore";
import { PerformanceGraphs } from "../_components/views/PerformanceGraphs";
import { ScoreReveal } from "../_components/views/ScoreReveal";
import { useAuth } from "../_context/AuthCtx";
import { useMobile } from "../_context/MobileCtx";
import { useSettings } from "../_context/SettingsCtx";
import { useTodo } from "../_context/TodoCtx";
import { apiFetch } from "../_lib/apiFetch";
import { tasksOnDate } from "../_lib/dates";
import { buildHistory } from "../_lib/history";
import type { Task, ApiScore } from "../_types";

type Phase = "calculatingScore" | "score" | "graphs";

export default function PerformanceRoute() {
  const { tasks } = useTodo();
  const { scoring } = useSettings();
  const { personId } = useAuth();
  const isMobile = useMobile();
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
    [tasks, scoring.includeDaily, scoring.includeWeekly, scoring.includeMonthly, scoring.includeQuarterly, scoring.includeOnce],
  );
  const doneToday = todayTasks.filter((t) => t.done).length;
  const totalToday = todayTasks.length;
  const localScore = totalToday === 0 ? 0 : Math.round((doneToday / totalToday) * 100);

  const [phase, setPhase] = useState<Phase>(personId ? "calculatingScore" : "score");
  const [score, setScore] = useState(personId ? 0 : localScore);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const history = useMemo(() => buildHistory(tasks), []);

  useEffect(() => {
    if (!personId) return;
    apiFetch<ApiScore>(`/api/scoring/${personId}`)
      .then((data) => {
        setScore(data.score);
        setPhase("score");
      })
      .catch(() => {
        setScore(localScore);
        setPhase("score");
      });
  // localScore intentionally omitted — we fetch once on mount, not on every task change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

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
