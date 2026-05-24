'use client';

export interface ToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

export function Toggle({ value, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!value);
      }}
      style={{
        width: 36,
        height: 22,
        borderRadius: 999,
        background: value ? 'var(--accent)' : 'var(--line-strong)',
        position: 'relative',
        transition: 'background 160ms ease',
        flex: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: value ? 16 : 2,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          transition: 'left 200ms cubic-bezier(.22,.61,.36,1)',
        }}
      />
    </button>
  );
}
