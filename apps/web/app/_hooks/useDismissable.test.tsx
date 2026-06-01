import { fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useDismissable } from './useDismissable';

function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDismissable(open, ref, onClose);
  return (
    <div>
      <div ref={ref} data-testid="inside">
        inside
      </div>
      <div data-testid="outside">outside</div>
    </div>
  );
}

describe('useDismissable', () => {
  it('closes on an outside mousedown when open', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness open onClose={onClose} />);
    fireEvent.mouseDown(getByTestId('outside'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close when clicking inside the ref', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness open onClose={onClose} />);
    fireEvent.mouseDown(getByTestId('inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on the Escape key', () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('ignores other keys', () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does nothing while closed', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Harness open={false} onClose={onClose} />);
    fireEvent.mouseDown(getByTestId('outside'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
