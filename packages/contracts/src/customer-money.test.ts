import { describe, expect, it } from 'vitest';

import { formatDeltaMinor, formatTryMinor, multiplyMinor } from './customer-money.js';

describe('formatTryMinor', () => {
  it('renders Stitch-style TRY without decimals for whole lira', () => {
    expect(formatTryMinor('29500')).toBe('295 ₺');
  });

  it('keeps two decimals for other currencies', () => {
    expect(formatTryMinor('1234', 'USD')).toBe('12.34 USD');
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
