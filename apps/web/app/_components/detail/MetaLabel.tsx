import type { ReactNode } from 'react';
import { Icon } from '../atoms/Icon';
import type { IconName } from '../../_types';

export interface MetaLabelProps {
  icon?: IconName;
  children: ReactNode;
}

export function MetaLabel({ icon, children }: MetaLabelProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: 'var(--mono)',
        fontSize: 11,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
        paddingTop: 4,
      }}
    >
      {icon && <Icon name={icon} size={12} color="var(--ink-3)" />}
      {children}
    </div>
  );
}
