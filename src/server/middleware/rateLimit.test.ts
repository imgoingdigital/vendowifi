import { describe, it, expect } from 'vitest';
import { rateLimit, rlKey } from './rateLimit';

describe('rateLimit', () => {
  it('allows first request and blocks after max', async () => {
    const key = rlKey(['testcase', Date.now()]);
    const first = await rateLimit(key, { windowMs: 1000, max: 2 });
    expect(first.allowed).toBe(true);
    const second = await rateLimit(key, { windowMs: 1000, max: 2 });
    expect(second.allowed).toBe(true);
    const third = await rateLimit(key, { windowMs: 1000, max: 2 });
    expect(third.allowed).toBe(false);
  });
});
