'use client';

import { useEffect, type RefObject } from 'react';

/**
 * While `open` is true, close the popover when:
 *   - the user clicks outside `ref`, or
 *   - presses Escape.
 *
 * Used by AssigneeField / StartsOnField / TypeField — same pattern
 * that previously lived inline in each one.
 */
export function useDismissable(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, ref, onClose]);
}
