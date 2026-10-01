import { describe, expect, it } from 'vitest';

import { formatDeliveryWindow, formatDeltaMinor, formatTryMinor, multiplyMinor } from './money.js';

describe('formatTryMinor', () => {
  it('renders Stitch-style TRY without decimals for whole lira', () => {
    expect(formatTryMinor('29500')).toBe('295 ₺');
  });

  it('keeps two decimals for other currencies', () => {
    expect(formatTryMinor('1234', 'USD')).toBe('12.34 USD');
  });
});

describe('formatDeliveryWindow', () => {
  it('renders a min–max window', () => {
    expect(formatDeliveryWindow(20, 30)).toBe('20–30 dk');
  });

  it('returns null when both bounds are zero', () => {
    expect(formatDeliveryWindow(0, 0)).toBeNull();
  });
});

describe('formatDeltaMinor', () => {
  it('renders included extras as Dahil', () => {
    expect(formatDeltaMinor('0')).toBe('Dahil');
  });

  it('prefixes positive extras', () => {
    expect(formatDeltaMinor('9500')).toBe('+95 ₺');
  });
});

describe('multiplyMinor', () => {
  it('scales a unit preview by quantity', () => {
    expect(multiplyMinor('29500', 2)).toBe('59000');
  });
});
