'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import type { ProfileSettings as ProfileSettingsValue } from '../../_types';
import { API_URL } from '../../_lib/apiFetch';
import { SettingsField } from './SettingsField';
import styles from './settings.module.css';

export interface ProfileSettingsProps {
  profile: ProfileSettingsValue;
  patch: (patch: Partial<ProfileSettingsValue>) => void;
  onUploadPhoto: (file: File) => Promise<void>;
}

const PALETTE = ['#c97a3c', '#3d3a35', '#6a8c5d', '#4a76b8', '#a85878', '#7a6cb8'];

// Mirror the server's limits (PersonController) so bad files are rejected
// instantly, without uploading megabytes only to be turned away with a 400.
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

type UploadStatus =
  | { state: 'idle' }
  | { state: 'uploading' }
  | { state: 'done' }
  | { state: 'error'; message: string };

export function ProfileSettings({ profile, patch, onUploadPhoto }: ProfileSettingsProps) {
  const [hover, setHover] = useState(false);
  const [status, setStatus] = useState<UploadStatus>({ state: 'idle' });
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;

    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setStatus({
        state: 'error',
        message: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}.`,
      });
      return;
    }
    if (f.size > MAX_PHOTO_BYTES) {
      setStatus({ state: 'error', message: 'File exceeds the 5 MB limit.' });
      return;
    }

    setStatus({ state: 'uploading' });
    try {
      await onUploadPhoto(f);
      setStatus({ state: 'done' });
    } catch (err) {
      setStatus({
        state: 'error',
        message: err instanceof Error ? err.message : 'Upload failed.',
      });
    }
  };

  const uploading = status.state === 'uploading';

  // photoUrl is a server-relative path ("/uploads/avatars/…") — prefix with the API origin.
  const photoSrc = profile.photo
    ? profile.photo.startsWith('/')
      ? `${API_URL}${profile.photo}`
      : profile.photo
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => !uploading && fileRef.current && fileRef.current.click()}
          title="Upload photo"
          style={{
            position: 'relative',
            width: 78,
            height: 78,
            borderRadius: 999,
            background: profile.color,
            padding: 3,
            flex: 'none',
            cursor: uploading ? 'wait' : 'pointer',
            boxShadow: '0 0 0 1px var(--bg)',
            transition: 'background 160ms ease',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              borderRadius: 999,
              overflow: 'hidden',
              background: photoSrc ? 'var(--bg)' : profile.color,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--display)',
              fontWeight: 500,
              fontSize: 28,
              letterSpacing: '-0.02em',
              border: '2px solid var(--bg)',
            }}
          >
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoSrc}
                alt="profile"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <span>{(profile.name || '?').trim().slice(0, 1).toUpperCase()}</span>
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(20,16,10,0.55)',
                opacity: hover || uploading ? 1 : 0,
                transition: 'opacity 160ms ease',
                color: '#fff',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              {uploading ? (
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    border: '2px solid rgba(255,255,255,0.35)',
                    borderTopColor: '#fff',
                    animation: 'profile-spin 700ms linear infinite',
                  }}
                />
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              )}
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {uploading ? 'uploading' : photoSrc ? 'change' : 'upload'}
              </span>
            </div>
            <style>{'@keyframes profile-spin{to{transform:rotate(360deg)}}'}</style>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={onPick}
            style={{ display: 'none' }}
          />
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--ink-3)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            ring color {profile.photo && '· photo set'}
          </div>
          {status.state !== 'idle' && (
            <div
              role="status"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10.5,
                letterSpacing: '0.02em',
                marginBottom: 8,
                color:
                  status.state === 'error'
                    ? '#c0492f'
                    : status.state === 'done'
                      ? 'var(--accent, #6a8c5d)'
                      : 'var(--ink-3)',
              }}
            >
              {status.state === 'uploading' && 'Uploading photo…'}
              {status.state === 'done' && '✓ Photo updated'}
              {status.state === 'error' && status.message}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => patch({ color: c })}
                title="Use this ring color"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: c,
                  border:
                    profile.color === c
                      ? '2px solid var(--ink)'
                      : '2px solid transparent',
                  boxShadow:
                    profile.color === c ? '0 0 0 1px var(--bg)' : 'none',
                  transition: 'transform 120ms ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              />
            ))}
            {profile.photo && (
              <button
                onClick={() => patch({ photo: null })}
                style={{
                  marginLeft: 4,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--line)',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--bg-sunken)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>

      <SettingsField label="Name" hint="how you'll be addressed">
        <input
          value={profile.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Your name"
          className={styles.input}
        />
      </SettingsField>

      <SettingsField label="Email" hint="for reminders, eventually">
        <input
          value={profile.email}
          onChange={(e) => patch({ email: e.target.value })}
          placeholder="you@example.com"
          className={styles.input}
        />
      </SettingsField>
    </div>
  );
}
