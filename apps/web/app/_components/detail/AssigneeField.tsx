'use client';

import { useRef, useState } from 'react';
import { Avatar } from '../atoms/Avatar';
import { Icon } from '../atoms/Icon';
import { useDismissable } from '../../_hooks/useDismissable';
import { useResolvedPeople } from '../../_hooks/useResolvedPeople';
import type { PersonId } from '../../_types';

export interface AssigneeFieldProps {
  value: PersonId | null;
  onChange: (next: PersonId | null) => void;
}

export function AssigneeField({ value, onChange }: AssigneeFieldProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useDismissable(open, ref, () => setOpen(false));

  const people = useResolvedPeople();
  const person = people.find((x) => x.id === value) || null;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 9,
          padding: '4px 10px 4px 5px',
          marginLeft: -5,
          borderRadius: 999,
          fontSize: 13.5,
          color: person ? 'var(--ink)' : 'var(--ink-4)',
          transition: 'background 140ms ease',
          background: open ? 'var(--bg-sunken)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = 'var(--bg-sunken)';
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = 'transparent';
        }}
      >
        <Avatar person={person} size={22} />
        <span>{person ? person.name : 'unassigned'}</span>
        <Icon name="chevron" size={12} color="var(--ink-3)" />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            minWidth: 220,
            padding: 6,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            boxShadow: '0 18px 44px -18px rgba(20,16,10,0.22)',
          }}
        >
          <div
            style={{
              padding: '6px 10px 8px',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-4)',
            }}
          >
            Assign to
          </div>
          {people.map((p) => {
            const active = p.id === value;
            return (
              <button
                key={p.id}
                onClick={() => {
                  onChange(p.id);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 10px',
                  borderRadius: 8,
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
                  fontSize: 13.5,
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--bg-sunken)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Avatar person={p} size={22} />
                <span style={{ flex: 1 }}>{p.name}</span>
                {active && <Icon name="more" size={4} color="var(--accent)" />}
              </button>
            );
          })}
          {value && (
            <>
              <div
                style={{
                  height: 1,
                  background: 'var(--line)',
                  margin: '6px 4px',
                }}
              />
              <button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 10px',
                  borderRadius: 8,
                  fontSize: 13.5,
                  color: 'var(--ink-3)',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--bg-sunken)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Avatar person={null} size={22} />
                <span>Unassign</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
