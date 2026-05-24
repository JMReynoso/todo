'use client';

import { useEffect, useState } from 'react';
import type { HistoryBar } from '../../_types';

export interface BarChartProps {
  data: HistoryBar[];
  delay?: number;
}

export function BarChart({ data, delay = 0 }: BarChartProps) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf: number | undefined;
    const t0 = window.setTimeout(() => {
      const startT = performance.now();
      const dur = 1100;
      const tick = (t: number) => {
        const p = Math.min(1, (t - startT) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setProgress(eased);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(t0);
      if (raf !== undefined) cancelAnimationFrame(raf);
    };
  }, [delay]);

  const max = Math.max(...data.map((d) => d.total), 1);
  const W = 440;
  const H = 180;
  const padL = 10;
  const padR = 10;
  const padT = 12;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const slot = innerW / data.length;
  const barW = Math.min(slot * 0.6, 26);
  const baseY = padT + innerH;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <line
        x1={padL}
        y1={baseY}
        x2={W - padR}
        y2={baseY}
        stroke="var(--line)"
        strokeWidth="1"
      />
      {data.map((d, i) => {
        const cx = padL + i * slot + slot / 2;
        const bx = cx - barW / 2;
        const stagger = i * 0.05;
        const local = Math.max(0, Math.min(1, (progress - stagger) / (1 - stagger)));
        const eased = 1 - Math.pow(1 - local, 3);
        const fullH = (d.total / max) * innerH;
        const doneH = (d.done / max) * innerH * eased;
        const labelColor = d.current ? 'var(--ink)' : 'var(--ink-3)';
        return (
          <g key={i}>
            <rect x={bx} y={baseY - fullH} width={barW} height={fullH} rx={3} fill="var(--bg-sunken)" />
            <rect
              x={bx}
              y={baseY - doneH}
              width={barW}
              height={doneH}
              rx={3}
              fill="var(--accent)"
              opacity={d.current ? 1 : 0.78}
            />
            {local > 0.7 && d.done > 0 && (
              <text
                x={cx}
                y={baseY - doneH - 5}
                textAnchor="middle"
                fontFamily="var(--mono)"
                fontSize="9"
                fill="var(--ink-2)"
                letterSpacing="0.02em"
                opacity={Math.max(0, (local - 0.7) / 0.3)}
              >
                {d.done}
              </text>
            )}
            <text
              x={cx}
              y={H - padB + 16}
              textAnchor="middle"
              fontFamily="var(--mono)"
              fontSize="9.5"
              fill={labelColor}
              letterSpacing="0.04em"
              style={{ textTransform: 'uppercase' }}
            >
              {d.label}
            </text>
            {d.current && <circle cx={cx} cy={H - padB + 20} r="1.4" fill="var(--accent)" />}
          </g>
        );
      })}
    </svg>
  );
}
