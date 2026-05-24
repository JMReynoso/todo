export interface ProgressProps {
  done: number;
  total: number;
}

export function Progress({ done, total }: ProgressProps) {
  const pct = total === 0 ? 0 : done / total;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <svg width={44} height={44} viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" stroke="var(--line)" strokeWidth="2.5" fill="none" />
          <circle
            cx="22"
            cy="22"
            r="18"
            stroke="var(--accent)"
            strokeWidth="2.5"
            fill="none"
            strokeDasharray={`${Math.PI * 36 * pct} ${Math.PI * 36}`}
            strokeLinecap="round"
            transform="rotate(-90 22 22)"
            style={{ transition: 'stroke-dasharray 400ms ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 10.5,
            color: 'var(--ink-2)',
          }}
        >
          {Math.round(pct * 100)}
        </div>
      </div>
    </div>
  );
}
