'use client';

import { useEffect, useState } from 'react';

export interface ScoreBadgeProps {
  score: number;
  doneToday: number;
  totalToday: number;
}

export function ScoreBadge({ score, doneToday, totalToday }: ScoreBadgeProps) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number | undefined;
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(score * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf !== undefined) cancelAnimationFrame(raf);
    };
  }, [score]);

  const SIZE = 76;
  const STROKE = 4;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const dash = CIRC * (display / 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-3)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 3,
          }}
        >
          today&apos;s score
        </div>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
          }}
        >
          {doneToday} / {totalToday} complete
        </div>
      </div>
      <div style={{ position: 'relative', width: SIZE, height: SIZE, flex: 'none' }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="var(--line)" strokeWidth={STROKE} fill="none" />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="var(--accent)"
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${dash} ${CIRC}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--display)',
            fontWeight: 500,
            fontSize: 28,
            letterSpacing: '-0.03em',
            color: 'var(--ink)',
          }}
        >
          {display}
        </div>
      </div>
    </div>
  );
}
