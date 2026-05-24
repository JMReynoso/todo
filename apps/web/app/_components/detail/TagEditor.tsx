'use client';

import { useState } from 'react';
import { Icon } from '../atoms/Icon';

export interface TagEditorProps {
  tags: string[];
  onChange: (next: string[]) => void;
}

export function TagEditor({ tags, onChange }: TagEditorProps) {
  const [val, setVal] = useState('');
  const add = () => {
    const v = val.trim().toLowerCase().replace(/\s+/g, '-');
    if (!v || tags.includes(v)) {
      setVal('');
      return;
    }
    onChange([...tags, v]);
    setVal('');
  };
  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}
    >
      {tags.map((t) => (
        <button
          key={t}
          onClick={() => onChange(tags.filter((x) => x !== t))}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: 'var(--mono)',
            fontSize: 10.5,
            letterSpacing: '0.02em',
            padding: '2px 8px',
            borderRadius: 999,
            background: 'var(--bg-sunken)',
            color: 'var(--ink-2)',
          }}
        >
          {t}
          <Icon name="close" size={9} color="var(--ink-3)" />
        </button>
      ))}
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
        }}
        placeholder={tags.length ? '+ tag' : 'add tag…'}
        style={{
          fontSize: 12.5,
          fontFamily: 'var(--mono)',
          padding: '2px 6px',
          minWidth: 60,
          color: 'var(--ink-2)',
        }}
      />
    </div>
  );
}
