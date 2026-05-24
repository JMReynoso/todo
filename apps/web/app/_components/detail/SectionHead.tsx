import type { ReactNode } from 'react';

export interface SectionHeadProps {
  children: ReactNode;
}

export function SectionHead({ children }: SectionHeadProps) {
  return (
    <h3
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 10.5,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
        margin: '0 0 10px',
        fontWeight: 500,
      }}
    >
      {children}
    </h3>
  );
}
