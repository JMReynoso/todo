'use client';

import { useEffect, useState } from 'react';
import { BarChart } from './BarChart';
import type { HistoryBar } from '../../_types';

export interface ChartCardProps {
  eyebrow: string;
  title: string;
  summary: string;
  data: HistoryBar[];
  delay: number;
}

export function ChartCard({ eyebrow, title, summary, data, delay }: ChartCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  return (
    <div
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        padding: '20px 22px 18px',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 500ms ease, transform 500ms cubic-bezier(.22,.61,.36,1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--ink-3)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 500,
              fontSize: 22,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
          }}
        >
          {summary}
        </div>
      </div>
      <BarChart data={data} delay={delay + 200} />
    </div>
  );
}
