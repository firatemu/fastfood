import { describe, expect, it } from 'vitest';

import { mapOrderStatusToStitchStepperIndex } from './order-status';
import { osmEmbedUrl, trackingMapView } from './storefront/tracking-map';

describe('storefront order tracker mapping', () => {
  it('keeps cancelled off the happy-path stepper', () => {
    expect(mapOrderStatusToStitchStepperIndex('CANCELLED')).toBe(-1);
    expect(mapOrderStatusToStitchStepperIndex('PREPARING')).toBe(1);
    expect(mapOrderStatusToStitchStepperIndex('ON_THE_WAY')).toBe(2);
  });
});

describe('OSM map helper', () => {
  it('returns null without coordinates and embeds a bbox when present', () => {
    expect(osmEmbedUrl({})).toBeNull();
    const url = osmEmbedUrl({
      courier: { latitude: 41.01, longitude: 29.02 },
      destination: { latitude: 41.02, longitude: 29.03 },
    });
    expect(url).toContain('openstreetmap.org/export/embed.html');
    expect(url).toContain('marker=41.01');
  });

  it('marks the map unavailable when the storefront provider is off', () => {
    const view = trackingMapView({
      courier: { latitude: 41.01, longitude: 29.02 },
      env: { NEXT_PUBLIC_STOREFRONT_MAP_PROVIDER: 'none' },
    });
    expect(view.state).toBe('provider-unavailable');
    expect(view.url).toBeNull();
  });
});
