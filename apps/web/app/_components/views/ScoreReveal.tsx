'use client';

import { useEffect, useState } from 'react';
import { useMobile } from '../../_context/MobileCtx';

export interface ScoreRevealProps {
  score: number;
  doneToday: number;
  totalToday: number;
  onNext: () => void;
}

export function ScoreReveal({ score, doneToday, totalToday, onNext }: ScoreRevealProps) {
  const [display, setDisplay] = useState(0);
  const [mounted, setMounted] = useState(false);
  const isMobile = useMobile();

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    let raf: number | undefined;
    const start = performance.now();
    const dur = 1700;
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

  const SIZE = isMobile ? 240 : 340;
  const STROKE = isMobile ? 9 : 12;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const dash = CIRC * (display / 100);

  const verdict =
    score >= 90
      ? 'stellar'
      : score >= 70
        ? 'strong day'
        : score >= 40
          ? 'decent start'
          : score > 0
            ? 'keep going'
            : 'fresh slate';

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 110px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 36,
        paddingTop: 20,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11.5,
          color: 'var(--ink-3)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 500ms ease, transform 500ms ease',
        }}
      >
        today&apos;s score
      </div>

      <div
        style={{
          position: 'relative',
          width: SIZE,
          height: SIZE,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.92)',
          transition:
            'opacity 700ms ease 100ms, transform 700ms cubic-bezier(.22,.61,.36,1) 100ms',
        }}
      >
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
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 500,
              fontSize: isMobile ? 92 : 132,
              lineHeight: 1,
              color: 'var(--ink)',
              letterSpacing: '-0.06em',
            }}
          >
            {display}
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10.5,
              color: 'var(--ink-3)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            out of 100
          </div>
        </div>
      </div>

      <div
        style={{
          textAlign: 'center',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 700ms ease 800ms, transform 700ms ease 800ms',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--display)',
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: '-0.025em',
            marginBottom: 8,
          }}
        >
          {verdict}
          <span style={{ color: 'var(--accent)' }}>.</span>
        </div>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11.5,
            color: 'var(--ink-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {doneToday} of {totalToday} {totalToday === 1 ? 'task' : 'tasks'} complete today
        </div>
      </div>

      <button
        onClick={onNext}
        style={{
          padding: '13px 38px',
          borderRadius: 999,
          background: 'var(--ink)',
          color: 'var(--bg)',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.01em',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(10px)',
          transition:
            'opacity 700ms ease 1700ms, transform 700ms ease 1700ms, background 140ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-ink)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--ink)')}
      >
        Okay →
      </button>
    </div>
  );
}
