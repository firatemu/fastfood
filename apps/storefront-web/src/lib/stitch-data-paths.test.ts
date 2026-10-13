import { describe, expect, it } from 'vitest';

import { routeForDataPath } from './stitch-data-paths';

describe('routeForDataPath', () => {
  it('maps known Stitch data-path values', () => {
    expect(routeForDataPath('menu')).toBe('/');
    expect(routeForDataPath('hesabim')).toBe('/account');
    expect(routeForDataPath('siparis-takibi')).toBe('/orders');
    expect(routeForDataPath('subeler-and-hikaye')).toBe('/branches');
  });

  it('maps legal compliance data-paths', () => {
    expect(routeForDataPath('mesafeli-satis-sozlesmesi')).toBe('/mesafeli-satis-sozlesmesi');
    expect(routeForDataPath('mesafeli-satis')).toBe('/mesafeli-satis-sozlesmesi');
    expect(routeForDataPath('on-bilgilendirme-formu')).toBe('/on-bilgilendirme-formu');
    expect(routeForDataPath('iptal-ve-iade')).toBe('/iptal-ve-iade');
    expect(routeForDataPath('kvkk')).toBe('/kvkk');
    expect(routeForDataPath('gizlilik')).toBe('/gizlilik');
    expect(routeForDataPath('cerez-politikasi')).toBe('/cerez-politikasi');
    expect(routeForDataPath('kullanim-kosullari')).toBe('/kullanim-kosullari');
    expect(routeForDataPath('teslimat-kosullari')).toBe('/teslimat-kosullari');
    expect(routeForDataPath('kunye')).toBe('/kunye');
    expect(routeForDataPath('hesap-silme')).toBe('/hesap-silme');
    expect(routeForDataPath('legal')).toBe('/legal');
  });

  it('returns null for unknown paths', () => {
    expect(routeForDataPath('unknown-screen')).toBeNull();
  });
});
