import type { Person } from '../../_types';

export interface AvatarProps {
  person: Person | null;
  size?: number;
}

export function Avatar({ person, size = 22 }: AvatarProps) {
  if (!person) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          border: '1.25px dashed var(--line-strong)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-4)',
          fontFamily: 'var(--mono)',
          fontSize: size * 0.42,
        }}
      >
        ?
      </div>
    );
  }
  // Ring + inner pattern that mirrors the profile picture in settings.
  const ringPad = Math.max(1.5, size * 0.085);
  const gap = Math.max(1, Math.round(size * 0.05));
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: person.color,
        padding: ringPad,
        display: 'inline-flex',
        flex: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 999,
          background: person.photo ? 'var(--bg)' : person.color,
          border: `${gap}px solid var(--bg)`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'var(--mono)',
          fontSize: Math.max(8, size * 0.36),
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}
      >
        {person.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.photo}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          person.initials
        )}
      </div>
    </div>
  );
}
