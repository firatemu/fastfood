import { describe, expect, it } from 'vitest';

import { clubProgress } from './club-progress';

describe('clubProgress', () => {
  it('converts basis points to a percentage and a ratio', () => {
    const p = clubProgress({ progressBps: 4250, pointsToNextTier: 80, hasNextTier: true });
    expect(p.percent).toBe(43);
    expect(p.ratio).toBeCloseTo(0.425, 5);
  });

  it('never renders a bar wider than its track', () => {
    const over = clubProgress({ progressBps: 12_000, pointsToNextTier: 0, hasNextTier: true });
    expect(over.ratio).toBe(1);
    expect(over.percent).toBe(100);
  });

  it('never renders a negative fill', () => {
    const under = clubProgress({ progressBps: -300, pointsToNextTier: 10, hasNextTier: true });
    expect(under.ratio).toBe(0);
    expect(under.percent).toBe(0);
  });

  it('never reports negative points remaining', () => {
    const p = clubProgress({ progressBps: 9000, pointsToNextTier: -5, hasNextTier: true });
    expect(p.pointsRemaining).toBe(0);
  });

  it('hides the rail at the top tier even if a percentage arrives', () => {
    const p = clubProgress({ progressBps: 10_000, pointsToNextTier: 0, hasNextTier: false });
    expect(p.atMaxTier).toBe(true);
    expect(p.showRail).toBe(false);
  });

  it('falls back to zero rather than NaN when progress is missing', () => {
    const p = clubProgress({ progressBps: null, pointsToNextTier: null, hasNextTier: true });
    expect(Number.isNaN(p.percent)).toBe(false);
    expect(p.percent).toBe(0);
    expect(p.pointsRemaining).toBe(0);
  });

  it('truncates a fractional remainder instead of rendering decimals', () => {
    const p = clubProgress({ progressBps: 1000, pointsToNextTier: 12.9, hasNextTier: true });
    expect(p.pointsRemaining).toBe(12);
  });

  // The wire actually sends points as strings (BigInt-as-string contract), so
  // the string case is the real-world case, not an edge case.
  it('accepts pointsToNextTier as a numeric string', () => {
    const p = clubProgress({ progressBps: 2500, pointsToNextTier: '150', hasNextTier: true });
    expect(p.pointsRemaining).toBe(150);
    expect(p.percent).toBe(25);
  });

  it('treats a non-numeric points string as zero rather than NaN', () => {
    const p = clubProgress({ progressBps: 1000, pointsToNextTier: 'unknown', hasNextTier: true });
    expect(Number.isNaN(p.pointsRemaining)).toBe(false);
    expect(p.pointsRemaining).toBe(0);
  });
});