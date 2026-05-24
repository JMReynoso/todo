'use client';

export interface CheckProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  size?: number;
}

export function Check({ checked, onChange, size = 18 }: CheckProps) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: size * 0.28,
        border: `1.25px solid ${checked ? 'var(--accent)' : 'var(--line-strong)'}`,
        background: checked ? 'var(--accent)' : 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 160ms ease, border-color 160ms ease, transform 120ms ease',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = '')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
    >
      {checked && (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6.2 5 8.5 9.5 3.8"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
