import { describe, expect, it } from 'vitest';

import {
  allergenDisclaimer,
  branchFulfillmentLabel,
  dealEligibilityCopy,
  legalDocuments,
  parseScannedTablePayload,
  TRACKING_EXIT_HREF,
} from './content-map';

describe('branchFulfillmentLabel', () => {
  it('reports accepting delivery+pickup', () => {
    expect(
      branchFulfillmentLabel({ isAcceptingOrders: true, deliveryEnabled: true, pickupEnabled: true }),
    ).toBe('Teslimat ve gel-al');
  });

  it('reports closed kitchen honestly', () => {
    expect(
      branchFulfillmentLabel({ isAcceptingOrders: false, deliveryEnabled: true, pickupEnabled: true }),
    ).toBe('Şu an sipariş almıyor');
  });
});

describe('dealEligibilityCopy', () => {
  it('does not invent secret codes and names checkout as authority', () => {
    expect(
      dealEligibilityCopy({
        id: 'd1',
        code: 'LISTED',
        headline: 'Hoş geldin',
        description: null,
        kind: 'PERCENT',
        discountSummary: '%10',
        discountMinor: null,
        discountPercentBps: 1000,
        minMerchandiseMinor: '15000',
        validFrom: null,
        validTo: null,
        firstOrderOnly: true,
        branchRestricted: true,
        eligibility: 'first_order_only',
      }),
    ).toBe('Yalnızca ilk sipariş · Belirli şubeler · Min. 150 ₺');
  });
});

describe('legalDocuments', () => {
  it('keeps legal/company/disclaimer and drops hikaye', () => {
    const kvkk = {
      slug: 'kvkk',
      kind: 'LEGAL',
      title: 'KVKK',
      body: '',
      sections: [],
      effectiveAt: null,
      displayOrder: 2,
    };
    const company = {
      slug: 'sirket',
      kind: 'COMPANY',
      title: 'Şirket',
      body: '',
      sections: [],
      effectiveAt: null,
      displayOrder: 1,
    };
    const hikaye = {
      slug: 'hikaye',
      kind: 'STORY',
      title: 'H',
      body: '',
      sections: [],
      effectiveAt: null,
      displayOrder: 0,
    };
    expect(legalDocuments([hikaye, kvkk, company]).map((d) => d.slug)).toEqual(['sirket', 'kvkk']);
    expect(allergenDisclaimer([{ ...kvkk, kind: 'ALLERGEN_DISCLAIMER', slug: 'alerjen' }])?.slug).toBe('alerjen');
  });
});

describe('parseScannedTablePayload', () => {
  it('accepts a raw public code and a custom-scheme URL', () => {
    expect(parseScannedTablePayload('bhx7k2m9q4wp')).toBe('bhx7k2m9q4wp');
    expect(parseScannedTablePayload('fastfoodcustomer://table/T12-A')).toBe('T12-A');
  });

  it('rejects traversal', () => {
    expect(parseScannedTablePayload('../etc')).toBeNull();
  });
});

describe('tracking exit', () => {
  it('always returns the orders tab', () => {
    expect(TRACKING_EXIT_HREF).toBe('/(tabs)/orders');
  });
});
