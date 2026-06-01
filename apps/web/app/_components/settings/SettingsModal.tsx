'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { Icon } from '../atoms/Icon';
import { useAuth } from '../../_context/AuthCtx';
import { useMobile } from '../../_context/MobileCtx';
import { IS_DEMO } from '../../_lib/demo/config';
import modal from '../modal.module.css';
import type {
  ProfileSettings as ProfileSettingsValue,
  ScoringSettings as ScoringSettingsValue,
  Settings,
  SettingsSection,
} from '../../_types';
import { ProfileSettings } from './ProfileSettings';
import { ScoringSettings } from './ScoringSettings';

export interface SettingsModalProps {
  settings: Settings;
  patch: <S extends SettingsSection>(section: S, patch: Partial<Settings[S]>) => void;
  onClose: () => void;
  onUploadPhoto: (file: File) => Promise<void>;
}

type SettingsTab = 'profile' | 'scoring';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'scoring', label: 'Performance scoring' },
];

export function SettingsModal({ settings, patch, onClose, onUploadPhoto }: SettingsModalProps) {
  const isMobile = useMobile();
  const { isAuthenticated, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  useLayoutEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);
  const requestClose = () => {
    setClosing(true);
    setTimeout(onClose, 240);
  };
  // Close the modal first so its exit animation runs, then clear auth —
  // the Shell's auth-redirect effect routes the user to /login.
  const handleLogout = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
      logout();
    }, 240);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shown = mounted && !closing;

  const [section, setSection] = useState<SettingsTab>('profile');

  return (
    <>
      <div
        onClick={requestClose}
        className={`${modal.scrim} ${shown ? modal.scrimShown : ''}`}
        style={{ opacity: shown ? 1 : 0 }}
      />
      <div
        onClick={requestClose}
        className={`${modal.frame} ${isMobile ? modal.frameMobile : ''}`}
        style={{ pointerEvents: shown ? 'auto' : 'none' }}
      >
        <aside
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          className={`${modal.dialog} ${modal.dialogWide} ${
            shown ? modal.dialogShown : ''
          } ${isMobile ? `${modal.dialogMobile} ${modal.dialogWideMobile}` : ''}`}
          style={{
            opacity: shown ? 1 : 0,
            transform: shown
              ? 'scale(1) translateY(0)'
              : isMobile
                ? 'translateY(20px)'
                : 'scale(0.97) translateY(8px)',
          }}
        >
          <nav
            style={{
              background: 'var(--bg-sunken)',
              borderRight: isMobile ? '0' : '1px solid var(--line)',
              borderBottom: isMobile ? '1px solid var(--line)' : '0',
              padding: isMobile ? '10px 12px' : '22px 14px',
              display: isMobile ? 'flex' : 'block',
              gap: isMobile ? 6 : 0,
              overflowX: isMobile ? 'auto' : 'visible',
            }}
          >
            {!isMobile && (
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10.5,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                  padding: '0 8px 14px',
                }}
              >
                settings
              </div>
            )}
            {TABS.map((s) => {
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  style={{
                    width: isMobile ? 'auto' : '100%',
                    textAlign: 'left',
                    padding: isMobile ? '7px 14px' : '8px 12px',
                    borderRadius: isMobile ? 999 : 8,
                    marginBottom: isMobile ? 0 : 2,
                    background: active ? 'var(--bg)' : 'transparent',
                    color: active ? 'var(--ink)' : 'var(--ink-2)',
                    fontSize: 13.5,
                    fontWeight: active ? 500 : 400,
                    border: active ? '1px solid var(--line)' : '1px solid transparent',
                    transition: 'background 140ms ease, color 140ms ease',
                    whiteSpace: 'nowrap',
                    flex: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = 'var(--bg)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div
            style={{
              padding: isMobile ? '20px 18px' : '28px 32px',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10.5,
                    color: 'var(--ink-3)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  {section === 'profile'
                    ? 'who you are'
                    : 'what counts toward your score'}
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--display)',
                    fontWeight: 500,
                    fontSize: 32,
                    lineHeight: 1,
                    margin: 0,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {section === 'profile' ? 'profile' : 'performance scoring'}
                  <span style={{ color: 'var(--accent)' }}>.</span>
                </h2>
              </div>
              <button
                onClick={requestClose}
                title="Close (Esc)"
                style={{ padding: 8, borderRadius: 8, color: 'var(--ink-2)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--bg-sunken)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {section === 'profile' ? (
              <ProfileSettings
                profile={settings.profile}
                patch={(p: Partial<ProfileSettingsValue>) => patch('profile', p)}
                onUploadPhoto={onUploadPhoto}
              />
            ) : (
              <ScoringSettings
                scoring={settings.scoring}
                patch={(p: Partial<ScoringSettingsValue>) => patch('scoring', p)}
              />
            )}

            {isAuthenticated && !IS_DEMO && (
              <div
                style={{
                  marginTop: 28,
                  paddingTop: 20,
                  borderTop: '1px solid var(--line)',
                  display: 'flex',
                  justifyContent: 'flex-start',
                }}
              >
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: 'transparent',
                    color: 'var(--ink-2)',
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'background 140ms ease, color 140ms ease, border-color 140ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-sunken)';
                    e.currentTarget.style.color = 'var(--ink)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--ink-2)';
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
