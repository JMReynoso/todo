'use client';

import { useMobile } from '../../_context/MobileCtx';
import type { History, HistoryBar } from '../../_types';
import { ChartCard } from './ChartCard';
import { ScoreBadge } from './ScoreBadge';

export interface PerformanceGraphsProps {
  history: History;
  score: number;
  doneToday: number;
  totalToday: number;
}

const totals = (arr: HistoryBar[]) => arr.reduce((s, d) => s + d.done, 0);
const possible = (arr: HistoryBar[]) => arr.reduce((s, d) => s + d.total, 0);

export function PerformanceGraphs({
  history,
  score,
  doneToday,
  totalToday,
}: PerformanceGraphsProps) {
  const isMobile = useMobile();
  return (
    <div style={{ paddingTop: 32 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 28,
          gap: 32,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10.5,
              color: 'var(--ink-3)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            performance — at a glance
          </div>
          <h2
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 500,
              fontSize: 56,
              lineHeight: 0.98,
              margin: 0,
              color: 'var(--ink)',
              letterSpacing: '-0.035em',
            }}
          >
            your patterns<span style={{ color: 'var(--accent)' }}>.</span>
          </h2>
        </div>
        <ScoreBadge score={score} doneToday={doneToday} totalToday={totalToday} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 20,
        }}
      >
        <ChartCard
          eyebrow="Daily · last week"
          title="daily completions"
          summary={`${totals(history.daily)}/${possible(history.daily)} done`}
          data={history.daily}
          delay={0}
        />
        <ChartCard
          eyebrow="Weekly · last month"
          title="weekly completions"
          summary={`${totals(history.weekly)}/${possible(history.weekly)} done`}
          data={history.weekly}
          delay={140}
        />
        <ChartCard
          eyebrow="Monthly · last year"
          title="monthly completions"
          summary={`${totals(history.monthly)}/${possible(history.monthly)} done`}
          data={history.monthly}
          delay={280}
        />
        <ChartCard
          eyebrow="Quarterly · last year"
          title="quarterly completions"
          summary={`${totals(history.quarterly)}/${possible(history.quarterly)} done`}
          data={history.quarterly}
          delay={420}
        />
      </div>
    </div>
  );
}
