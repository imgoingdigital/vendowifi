import { describe, it, expect } from 'vitest';
import { generateVoucherCode } from '@/server/services/voucher';

describe('voucher code generation', () => {
  it('generates codes of requested length and mostly unique', () => {
    const len = 10;
    const set = new Set<string>();
    for(let i=0;i<500;i++){
      const code = generateVoucherCode(len);
      expect(code).toHaveLength(len);
      set.add(code);
    }
    // Expect high uniqueness (allow at most 1 duplicate)
    expect(set.size).toBeGreaterThan(498);
  });
});
