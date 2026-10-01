import { describe, expect, it } from 'vitest';

import { preferencePatchFromToggles, preferenceToToggles } from './preference-map';

describe('preference mapping', () => {
  it('patches only toggles that changed', () => {
    const original = {
      marketingOptIn: false,
      newsletterOptIn: false,
      orderUpdatesOptIn: true,
    };
    const next = preferenceToToggles(original);
    next.newsletterOptIn = true;
    expect(preferencePatchFromToggles(next, original)).toEqual({ newsletterOptIn: true });
    expect(preferencePatchFromToggles(original, original)).toBeNull();
  });
});
