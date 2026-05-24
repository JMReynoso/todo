'use client';

import { useEffect, useState } from 'react';

/** Returns true under ~720px wide. Single source of truth for layout breakpoint. */
export function useIsMobile(bp = 720): boolean {
  const [mobile, setMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < bp,
  );

  useEffect(() => {
    const m = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const on = (e: MediaQueryListEvent) => setMobile(e.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [bp]);

  // Mirror onto the html element so pure-CSS rules can branch too.
  useEffect(() => {
    document.documentElement.dataset.mobile = mobile ? 'true' : 'false';
  }, [mobile]);

  return mobile;
}
