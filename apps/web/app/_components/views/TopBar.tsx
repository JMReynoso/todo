'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '../atoms/Icon';
import { useMobile } from '../../_context/MobileCtx';
import type { IconName, Layout } from '../../_types';

export interface TopBarProps {
  query: string;
  setQuery: (q: string) => void;
  layout: Layout;
  setLayout: (l: Layout) => void;
  onOpenSettings: () => void;
}

interface ViewOption {
  id: Layout;
  icon: IconName;
  title: string;
}

const VIEWS: ViewOption[] = [
  { id: 'stacked', icon: 'stacked', title: 'Stacked' },
  { id: 'calendar', icon: 'calendar', title: 'Calendar' },
];

export function TopBar({
  query,
  setQuery,
  layout,
  setLayout,
  onOpenSettings,
}: TopBarProps) {
  const isMobile = useMobile();
  const pathname = usePathname();
  const onPerformance = pathname === '/performance';
  const onLogin = pathname === '/login';
  const now = new Date();
  const day = now.toLocaleDateString(undefined, { weekday: 'long' });
  const date = now.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <header
      style={{
        padding: isMobile ? '12px 16px 10px' : '22px 36px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 8 : 24,
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span
          style={{
            fontFamily: 'var(--display)',
            fontWeight: 500,
            fontSize: isMobile ? 22 : 26,
            lineHeight: 1,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
          }}
        >
          todo<span style={{ color: 'var(--accent)' }}>.</span>
        </span>
        {!isMobile && !onLogin && (
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-3)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            · a cadence
          </span>
        )}
      </div>
      {!onLogin && (
      <>
      <div style={{ flex: 1 }} />
      {onPerformance ? (
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: isMobile ? '7px 12px' : '7px 14px',
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'var(--bg-elev)',
            color: 'var(--ink-2)',
            fontSize: 13,
            letterSpacing: '-0.005em',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-sunken)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-elev)')}
        >
          <Icon name="back" size={13} stroke={1.6} />
          {!isMobile && <span>back to todo</span>}
        </Link>
      ) : (
        <Link
          href="/performance"
          title="Performance"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: isMobile ? '7px 10px' : '7px 14px',
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'var(--bg-elev)',
            color: 'var(--ink-2)',
            fontSize: 13,
            letterSpacing: '-0.005em',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-sunken)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-elev)')}
        >
          <Icon name="chart" size={13} stroke={1.6} />
          {!isMobile && <span>performance</span>}
        </Link>
      )}
      {!onPerformance && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: 3,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            borderRadius: 999,
          }}
        >
          {VIEWS.map((v) => {
            const active = layout === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setLayout(v.id)}
                title={v.title}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 28,
                  borderRadius: 999,
                  background: active ? 'var(--ink)' : 'transparent',
                  color: active ? 'var(--bg)' : 'var(--ink-3)',
                  transition: 'background 140ms ease, color 140ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.color = 'var(--ink)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.color = 'var(--ink-3)';
                }}
              >
                <Icon name={v.icon} size={15} stroke={1.6} />
              </button>
            );
          })}
        </div>
      )}
      {isMobile ? (
        <>
          <button
            onClick={() => setSearchOpen((o) => !o)}
            title="Search"
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            <Icon name="search" size={14} stroke={1.6} />
          </button>
          {searchOpen && (
            <div
              style={{
                order: 99,
                flex: '1 0 100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: 'var(--bg-elev)',
                border: '1px solid var(--line)',
                borderRadius: 999,
                marginTop: 4,
              }}
            >
              <Icon name="search" size={14} color="var(--ink-3)" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search tasks…"
                style={{ width: '100%', fontSize: 14 }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ color: 'var(--ink-3)' }}>
                  <Icon name="close" size={12} />
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 12px',
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            borderRadius: 999,
            flex: '0 1 220px',
            minWidth: 140,
            marginLeft: 12,
          }}
        >
          <Icon name="search" size={14} color="var(--ink-3)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search tasks…"
            style={{ width: '100%', fontSize: 13.5 }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: 'var(--ink-3)' }}>
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
      )}
      {!isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 500,
              fontSize: 18,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {day}
          </span>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10.5,
              color: 'var(--ink-3)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {date}
          </span>
        </div>
      )}
      <button
        onClick={onOpenSettings}
        title="Settings"
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          color: 'var(--ink-2)',
          marginLeft: isMobile ? 0 : 4,
          transition: 'background 140ms ease, transform 200ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-sunken)';
          e.currentTarget.style.transform = 'rotate(30deg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-elev)';
          e.currentTarget.style.transform = 'rotate(0deg)';
        }}
      >
        <Icon name="gear" size={15} stroke={1.5} />
      </button>
      </>
      )}
    </header>
  );
}
