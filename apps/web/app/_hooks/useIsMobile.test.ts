import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIsMobile } from './useIsMobile';

type Listener = (e: MediaQueryListEvent) => void;

let listeners: Listener[];
let matches: boolean;

function installMatchMedia(initialMatches: boolean) {
  matches = initialMatches;
  listeners = [];
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: (_: string, cb: Listener) => listeners.push(cb),
      removeEventListener: (_: string, cb: Listener) => {
        listeners = listeners.filter((l) => l !== cb);
      },
    })),
  );
}

describe('useIsMobile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initialises from window.innerWidth', () => {
    installMatchMedia(false);
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile(720));
    expect(result.current).toBe(true);
  });

  it('reports false on a wide viewport', () => {
    installMatchMedia(false);
    window.innerWidth = 1200;
    const { result } = renderHook(() => useIsMobile(720));
    expect(result.current).toBe(false);
  });

  it('updates when the media query changes', () => {
    installMatchMedia(false);
    window.innerWidth = 1200;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      listeners.forEach((l) => l({ matches: true } as MediaQueryListEvent));
    });
    expect(result.current).toBe(true);
  });

  it('mirrors the breakpoint state onto the html dataset', () => {
    installMatchMedia(false);
    window.innerWidth = 500;
    renderHook(() => useIsMobile(720));
    expect(document.documentElement.dataset.mobile).toBe('true');
  });

  it('removes its listener on unmount', () => {
    installMatchMedia(false);
    window.innerWidth = 1200;
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners.length).toBe(1);
    unmount();
    expect(listeners.length).toBe(0);
  });
});
