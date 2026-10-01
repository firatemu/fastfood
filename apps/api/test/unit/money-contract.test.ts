import {
  applyRateBps,
  InvalidMoneyStringError,
  moneyFromMinorString,
  moneyToMinorString,
} from '@fastfood/config';
import { describe, expect, it } from 'vitest';

describe('canonical money chain (foundation)', () => {
  it('parses and serializes money strings losslessly', async () => {
    const big = moneyFromMinorString('12990');
    expect(typeof big).toBe('bigint');
    expect(moneyToMinorString(big)).toBe('12990');
  });

  it('rejects non-integer money strings', async () => {
    expect(() => moneyFromMinorString('129.90')).toThrow(InvalidMoneyStringError);
    expect(() => moneyFromMinorString('12e3')).toThrow(InvalidMoneyStringError);
  });

  it('applies basis-point rounding per document 37', async () => {
    expect(applyRateBps(10000n, 500)).toBe(500n); // 5% of 10000 = 500
    expect(applyRateBps(10015n, 500)).toBe(501n); // half-up rounding
    expect(applyRateBps(99999n, 3333)).toBe(33330n);
    expect(applyRateBps(99999n, 3334)).toBe(33340n);
  });

  it('throws when given a negative rate or base', async () => {
    expect(() => applyRateBps(100n, -1)).toThrow();
    expect(() => applyRateBps(-1n, 100)).toThrow();
  });
});
