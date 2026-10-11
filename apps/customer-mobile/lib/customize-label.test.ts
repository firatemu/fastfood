import { describe, expect, it } from 'vitest';

import { customizeLabel } from './customize-label';

describe('customizeLabel', () => {
  it('labels a burger with the default customize action', () => {
    expect(customizeLabel({ volumeMl: null, badge: 'Şefin Tercihi' })).toBe('ÖZELLEŞTİR');
  });

  it('labels a drink by its size choice, badge or not', () => {
    expect(customizeLabel({ volumeMl: 330, badge: null })).toBe('BOYUT');
    expect(customizeLabel({ volumeMl: 330, badge: 'Yan Lezzet' })).toBe('BOYUT');
  });

  it('labels a side by its portion choice', () => {
    expect(customizeLabel({ volumeMl: null, badge: 'Yan Lezzet' })).toBe('PORSİYON SEÇ');
  });

  it('keeps Turkish dotted capital İ — RN textTransform would render a dotless I', () => {
    // `textTransform: 'uppercase'` on "Özelleştir" yields "ÖZELLEŞTIR" on React
    // Native. The string is pre-uppercased here so that cannot happen.
    expect(customizeLabel({ volumeMl: null, badge: null })).toBe('ÖZELLEŞTİR');
    expect(customizeLabel({ volumeMl: null, badge: null }).replace('İ', 'I')).toBe('ÖZELLEŞTIR');
    expect(customizeLabel({ volumeMl: null, badge: 'Yan Lezzet' })).toBe('PORSİYON SEÇ');
  });

  it('treats a zero volume as a drink, matching the web predicate', () => {
    expect(customizeLabel({ volumeMl: 0, badge: null })).toBe('BOYUT');
  });
});