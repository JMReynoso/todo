import { describe, expect, it } from 'vitest';
import { uid } from '@/app/_lib/uid';

describe('uid', () => {
  it('returns a non-empty base-36 string', () => {
    const id = uid();
    expect(id).toBeTypeOf('string');
    expect(id.length).toBeGreaterThan(0);
    expect(id).toMatch(/^[0-9a-z]+$/);
  });

  it('produces distinct values across many calls', () => {
    const ids = new Set(Array.from({ length: 500 }, () => uid()));
    // Collisions are theoretically possible but vanishingly unlikely at 500.
    expect(ids.size).toBeGreaterThan(490);
  });
});
