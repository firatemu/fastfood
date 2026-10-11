import { describe, expect, it } from 'vitest';

import { routeForDataPath } from './stitch-data-paths';

describe('routeForDataPath', () => {
  it('maps known Stitch data-path values', () => {
    expect(routeForDataPath('menu')).toBe('/');
    expect(routeForDataPath('hesabim')).toBe('/account');
    expect(routeForDataPath('siparis-takibi')).toBe('/orders');
    expect(routeForDataPath('subeler-and-hikaye')).toBe('/branches');
  });

  it('returns null for unknown paths', () => {
    expect(routeForDataPath('unknown-screen')).toBeNull();
  });
});
