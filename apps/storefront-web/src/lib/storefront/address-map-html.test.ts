import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { addressMapHtml } from './address-map-html';

describe('addressMapHtml', () => {
  const originalEnv = process.env.NEXT_PUBLIC_STOREFRONT_MAP_FRAME_ORIGIN;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_STOREFRONT_MAP_FRAME_ORIGIN;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_STOREFRONT_MAP_FRAME_ORIGIN = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_STOREFRONT_MAP_FRAME_ORIGIN;
    }
  });

  it('uses configured origin when provided', () => {
    process.env.NEXT_PUBLIC_STOREFRONT_MAP_FRAME_ORIGIN = 'https://mapburger.azem.cloud';
    const url = addressMapHtml({ latitude: 41.0, longitude: 29.0 });
    expect(url).toBeTruthy();
    expect(url).toContain('https://mapburger.azem.cloud/address-map-picker.html');
    expect(url).toContain('lat=41');
    expect(url).toContain('lng=29');
    expect(url).toContain('selected=1');
  });

  it('falls back to local development origin on port 3110', () => {
    const url = addressMapHtml({ latitude: 37.0, longitude: 35.3 });
    expect(url).toBeTruthy();
    expect(url).toContain('http://map.localhost:3110/address-map-picker.html');
    expect(url).toContain('lat=37');
    expect(url).toContain('lng=35.3');
  });

  it('marks non-interactive mode with interactive=0 query param', () => {
    const url = addressMapHtml({ latitude: 37.0, longitude: 35.3 }, null, false);
    expect(url).toContain('interactive=0');
  });
});
