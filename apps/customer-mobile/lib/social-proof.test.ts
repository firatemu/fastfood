import { describe, expect, it } from 'vitest';

import { formatRatingBps, formatRelativeTr, starRow } from './social-proof';

const NOW = Date.parse('2026-10-11T12:00:00.000Z');

describe('formatRatingBps', () => {
  it('converts basis points to a one-decimal rating', () => {
    expect(formatRatingBps(45000)).toBe('450,0');
    expect(formatRatingBps(42300)).toBe('423,0');
  });

  it('returns null when there is no rating to show', () => {
    expect(formatRatingBps(null)).toBeNull();
    expect(formatRatingBps(0)).toBeNull();
    expect(formatRatingBps(-100)).toBeNull();
  });

  it('never returns a zero rating as a real rating', () => {
    // A 0 bps average must read as "no rating", not as a displayed "0,0".
    expect(formatRatingBps(0)).not.toBe('0,0');
  });
});

describe('formatRelativeTr', () => {
  it('labels anything under an hour as recent', () => {
    expect(formatRelativeTr('2026-10-11T11:59:00.000Z', NOW)).toBe('Az önce');
    expect(formatRelativeTr('2026-10-11T11:30:00.000Z', NOW)).toBe('Az önce');
  });

  it('splits the same day into today and yesterday', () => {
    expect(formatRelativeTr('2026-10-11T06:00:00.000Z', NOW)).toBe('Bugün');
    expect(formatRelativeTr('2026-10-11T00:30:00.000Z', NOW)).toBe('Bugün');
    expect(formatRelativeTr('2026-10-10T23:00:00.000Z', NOW)).toBe('Dün');
  });

  it('counts days, then collapses to weeks', () => {
    expect(formatRelativeTr('2026-10-09T12:00:00.000Z', NOW)).toBe('2 gün önce');
    expect(formatRelativeTr('2026-10-04T12:00:00.000Z', NOW)).toBe('1 hafta önce');
    expect(formatRelativeTr('2026-09-25T12:00:00.000Z', NOW)).toBe('2 hafta önce');
  });

  it('returns an empty string for an unparseable date rather than throwing', () => {
    expect(formatRelativeTr('not-a-date', NOW)).toBe('');
    expect(formatRelativeTr('', NOW)).toBe('');
  });
});

describe('starRow', () => {
  it('fills stars up to the rating', () => {
    expect(starRow(5)).toBe('★★★★★');
    expect(starRow(4)).toBe('★★★★☆');
    expect(starRow(3)).toBe('★★★☆☆');
  });

  it('clamps out-of-range ratings instead of over- or under-filling', () => {
    expect(starRow(9)).toBe('★★★★★');
    expect(starRow(-2)).toBe('☆☆☆☆☆');
    expect(starRow(Number.NaN)).toBe('');
  });

  it('always produces exactly five glyphs for a valid rating', () => {
    for (const rating of [0, 1, 2, 3, 4, 5]) {
      expect(starRow(rating)).toHaveLength(5);
    }
  });
});