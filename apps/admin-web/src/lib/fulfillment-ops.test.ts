import { describe, expect, it } from 'vitest';

import {
  isA1Path,
  isA2Path,
  isA3Path,
  isOpsShellPath,
  isRouteIdentifiedBranchPath,
  routeBranchId,
} from './admin-routes';
import {
  a3ResourceScope,
  canDispatchAssign,
  filterAvailabilityRows,
  PROFILE_FIELDS,
  PROFILE_LIMITS,
  checkProfile,
  coordinateReadout,
  isE164Phone,
  isHhMm,
  isValidLatitude,
  isValidLongitude,
  majorToMinor,
  parseCoordinate,
  parsePolygonGeoJson,
  weekdayLabel,
  type BranchDraft,
} from './fulfillment-ops';

describe('isA3Path / ops shell', () => {
  it('covers branch and courier routes without swallowing A4+', () => {
    expect(isA3Path('/branches')).toBe(true);
    expect(isA3Path('/branches/abc')).toBe(true);
    expect(isA3Path('/branches/service-areas')).toBe(true);
    expect(isA3Path('/branches/availability')).toBe(true);
    expect(isA3Path('/couriers')).toBe(true);
    expect(isA3Path('/customers')).toBe(false);
    expect(isA1Path('/couriers')).toBe(false);
    expect(isA2Path('/branches')).toBe(false);
    expect(isOpsShellPath('/branches')).toBe(true);
    expect(isOpsShellPath('/couriers')).toBe(true);
    expect(isOpsShellPath('/customers')).toBe(true);
  });

  it('keeps static branch siblings out of route-identified detail', () => {
    expect(isRouteIdentifiedBranchPath('/branches/01900000-0000-7000-8000-faaaaaaaaaaa')).toBe(
      true,
    );
    expect(isRouteIdentifiedBranchPath('/branches/service-areas')).toBe(false);
    expect(isRouteIdentifiedBranchPath('/branches/availability')).toBe(false);
    expect(routeBranchId('/branches/service-areas')).toBeNull();
    expect(routeBranchId('/branches/xyz')).toBe('xyz');
  });
});

describe('a3ResourceScope', () => {
  it('classifies list, detail, scoped, and mixed courier pages', () => {
    expect(a3ResourceScope('/branches')).toBe('GLOBAL_MASTER_DATA');
    expect(a3ResourceScope('/branches/abc')).toBe('ROUTE_IDENTIFIED_BRANCH');
    expect(a3ResourceScope('/branches/service-areas')).toBe('BRANCH_SCOPED');
    expect(a3ResourceScope('/branches/availability')).toBe('BRANCH_SCOPED');
    expect(a3ResourceScope('/couriers')).toBe('MIXED');
    expect(a3ResourceScope('/orders')).toBeNull();
  });
});

describe('fulfillment mapping guards', () => {
  it('labels weekdays and validates hours / phone / coordinates', () => {
    expect(weekdayLabel(0)).toBe('Pazar');
    expect(weekdayLabel(1)).toBe('Pazartesi');
    expect(isHhMm('09:00')).toBe(true);
    expect(isHhMm('9:00')).toBe(false);
    expect(isE164Phone('+905551112233')).toBe(true);
    expect(isE164Phone('05551112233')).toBe(false);
    expect(parseCoordinate('41,03')).toBe(41.03);
    expect(isValidLatitude(41.03)).toBe(true);
    expect(isValidLongitude(200)).toBe(false);
  });

  it('parses GeoJSON polygons only', () => {
    expect(parsePolygonGeoJson('not json')).toBeNull();
    expect(parsePolygonGeoJson('{"type":"Point","coordinates":[0,0]}')).toBeNull();
    expect(
      parsePolygonGeoJson('{"type":"Polygon","coordinates":[[[28.96,41],[28.98,41],[28.96,41]]]}')
        ?.type,
    ).toBe('Polygon');
  });

  it('requires real UUIDs for dispatch assign', () => {
    expect(
      canDispatchAssign({
        orderId: '01900000-0000-7000-8000-aaaaaaaaaaaa',
        courierId: '01900000-0000-7000-8000-bbbbbbbbbbbb',
        branchId: '01900000-0000-7000-8000-faaaaaaaaaaa',
      }),
    ).toBe(true);
    expect(
      canDispatchAssign({
        orderId: 'not-a-uuid',
        courierId: '01900000-0000-7000-8000-bbbbbbbbbbbb',
        branchId: '01900000-0000-7000-8000-faaaaaaaaaaa',
      }),
    ).toBe(false);
  });
});

describe('filterAvailabilityRows', () => {
  const rows = [
    { productId: '1', name: 'Smash', slug: 'smash', isActive: true, isAvailable: true },
    { productId: '2', name: 'Cola', slug: 'cola', isActive: true, isAvailable: false },
    { productId: '3', name: 'Old', slug: 'old', isActive: false, isAvailable: true },
  ];

  it('filters independently of global isActive', () => {
    expect(
      filterAvailabilityRows(rows, { q: '', filter: 'unavailable' }).map((r) => r.productId),
    ).toEqual(['2']);
    expect(
      filterAvailabilityRows(rows, { q: 'smash', filter: '' }).map((r) => r.productId),
    ).toEqual(['1']);
    expect(
      filterAvailabilityRows(rows, { q: '', filter: 'globally-inactive' }).map((r) => r.productId),
    ).toEqual(['3']);
  });
});

function draft(overrides: Partial<BranchDraft> = {}): BranchDraft {
  return {
    code: 'KADIKOY-01',
    name: 'Kadıköy Merkez',
    address: 'Moda Cad. No: 1, Kadıköy / İstanbul',
    latitude: '41.0082',
    longitude: '28.9784',
    phone: '+905551112233',
    minOrder: '50',
    deliveryFee: '9,90',
    accepting: true,
    ...overrides,
  };
}

describe('majorToMinor', () => {
  it('converts major-unit input to the minor-unit integer the API expects', () => {
    expect(majorToMinor('0')).toBe('0');
    expect(majorToMinor('50')).toBe('5000');
    expect(majorToMinor('9,90')).toBe('990');
    expect(majorToMinor('0.05')).toBe('5');
    expect(majorToMinor(' 12,5 ')).toBe('1250');
  });

  it('rejects anything the server regex would reject', () => {
    expect(majorToMinor('')).toBeNull();
    expect(majorToMinor('1.999')).toBeNull();
    expect(majorToMinor('abc')).toBeNull();
    expect(majorToMinor('-5')).toBeNull();
    expect(majorToMinor('1,2,3')).toBeNull();
  });
});

describe('checkProfile — create', () => {
  it('accepts a complete draft and returns trimmed wire values', () => {
    const result = checkProfile(draft({ name: '  Kadıköy  ', address: ' Moda Cad. ' }), 'create');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values).toMatchObject({
      code: 'KADIKOY-01',
      name: 'Kadıköy',
      addressLine: 'Moda Cad.',
      latitude: 41.0082,
      longitude: 28.9784,
      phone: '+905551112233',
      minOrderMinor: '5000',
      deliveryFeeMinor: '990',
    });
  });

  it('reports every missing create-only field at once', () => {
    const result = checkProfile(
      draft({ code: '', name: '', address: '', latitude: '', longitude: '' }),
      'create',
    );
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual([
      'address',
      'code',
      'latitude',
      'longitude',
      'name',
    ]);
  });

  it('focuses the first invalid field in visual order, not in check order', () => {
    // `address` is checked before `code` inside checkProfile, but the form reads
    // name, code, address, so the code field is the one that must receive focus.
    const result = checkProfile(draft({ code: '', name: '' }), 'create');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.firstInvalid).toBe('name');
    const next = checkProfile(draft({ code: '', latitude: '999' }), 'create');
    if (next.ok) throw new Error('expected invalid');
    expect(next.firstInvalid).toBe('code');
  });

  it('treats an empty coordinate as missing rather than as zero', () => {
    // `parseCoordinate('')` returns 0, and 0 is a valid latitude — the empty
    // string must be caught by its own rule or a blank branch lands at null island.
    const result = checkProfile(draft({ latitude: '   ' }), 'create');
    expect(result.ok).toBe(false);
    expect(result.errors.latitude).toBe('Enlem zorunlu.');
  });

  it('enforces the WGS84 bounds', () => {
    expect(checkProfile(draft({ latitude: '90' }), 'create').ok).toBe(true);
    expect(checkProfile(draft({ latitude: '-90' }), 'create').ok).toBe(true);
    expect(checkProfile(draft({ latitude: '90.0001' }), 'create').errors.latitude).toBeDefined();
    expect(checkProfile(draft({ longitude: '180' }), 'create').ok).toBe(true);
    expect(checkProfile(draft({ longitude: '180.1' }), 'create').errors.longitude).toBeDefined();
    expect(checkProfile(draft({ latitude: 'abc' }), 'create').errors.latitude).toContain('-90');
    expect(checkProfile(draft({ longitude: 'abc' }), 'create').errors.longitude).toContain('-180');
  });

  it('enforces the server length limits', () => {
    expect(checkProfile(draft({ name: 'x'.repeat(PROFILE_LIMITS.name) }), 'create').ok).toBe(true);
    expect(
      checkProfile(draft({ name: 'x'.repeat(PROFILE_LIMITS.name + 1) }), 'create').errors.name,
    ).toBeDefined();
    expect(checkProfile(draft({ address: 'x'.repeat(PROFILE_LIMITS.address) }), 'create').ok).toBe(
      true,
    );
    expect(
      checkProfile(draft({ address: 'x'.repeat(PROFILE_LIMITS.address + 1) }), 'create').errors
        .address,
    ).toBeDefined();
    expect(checkProfile(draft({ code: 'x'.repeat(PROFILE_LIMITS.code) }), 'create').ok).toBe(true);
    expect(
      checkProfile(draft({ code: 'x'.repeat(PROFILE_LIMITS.code + 1) }), 'create').errors.code,
    ).toBeDefined();
  });

  it('matches the E.164 phone rule of the server schema', () => {
    // Server: /^\+\d{10,15}$/ — the bound is on the digits AFTER the plus.
    expect(checkProfile(draft({ phone: '' }), 'create').ok).toBe(true);
    expect(checkProfile(draft({ phone: '05551112233' }), 'create').errors.phone).toBeDefined();
    expect(checkProfile(draft({ phone: '90 555 111 22 33' }), 'create').errors.phone).toBeDefined();
    expect(checkProfile(draft({ phone: '+123456789' }), 'create').errors.phone).toBeDefined();
    expect(checkProfile(draft({ phone: '+1234567890' }), 'create').ok).toBe(true);
    expect(checkProfile(draft({ phone: '+9055511122334' }), 'create').ok).toBe(true);
    expect(
      checkProfile(draft({ phone: '+1234567890123456' }), 'create').errors.phone,
    ).toBeDefined();
  });

  it('rejects money the server would reject', () => {
    expect(checkProfile(draft({ minOrder: '1.999' }), 'create').errors.minOrder).toBeDefined();
    expect(checkProfile(draft({ deliveryFee: '' }), 'create').errors.deliveryFee).toBeDefined();
    expect(checkProfile(draft({ minOrder: '0' }), 'create').ok).toBe(true);
  });
});

describe('checkProfile — edit', () => {
  it('never validates code or coordinates, because PATCH does not carry them', () => {
    const result = checkProfile(
      draft({ code: '', latitude: '', longitude: '', name: '', address: '' }),
      'edit',
    );
    expect(result.ok).toBe(false);
    expect(result.errors.code).toBeUndefined();
    expect(result.errors.latitude).toBeUndefined();
    expect(result.errors.longitude).toBeUndefined();
    expect(Object.keys(result.errors).sort()).toEqual(['address', 'name']);
  });

  it('validates a read-only legacy coordinate instead of rejecting it', () => {
    // Edit renders the stored coordinate read-only; a blank or unparsable one
    // must not block an edit that does not touch it.
    expect(checkProfile(draft({ latitude: '', longitude: '' }), 'edit').ok).toBe(true);
    expect(checkProfile(draft({ latitude: 'n/a', longitude: 'n/a' }), 'edit').ok).toBe(true);
  });

  it('still validates everything PATCH does send', () => {
    expect(checkProfile(draft({ name: '' }), 'edit').errors.name).toBeDefined();
    expect(checkProfile(draft({ address: '' }), 'edit').errors.address).toBeDefined();
    expect(checkProfile(draft({ phone: '0532' }), 'edit').errors.phone).toBeDefined();
    expect(checkProfile(draft({ deliveryFee: 'x' }), 'edit').errors.deliveryFee).toBeDefined();
  });
});

describe('coordinateReadout', () => {
  it('formats a valid create pair to five decimals', () => {
    expect(coordinateReadout(draft(), 'create')).toEqual({
      text: 'WGS84 derece · 41.00820, 28.97840',
      ok: true,
    });
  });

  it('accepts a comma decimal separator', () => {
    expect(coordinateReadout(draft({ latitude: '41,0082' }), 'create').ok).toBe(true);
  });

  it('explains each rejection instead of showing a bare error', () => {
    expect(coordinateReadout(draft({ latitude: '' }), 'create').text).toContain('zorunlu');
    expect(coordinateReadout(draft({ longitude: '' }), 'create').text).toContain('zorunlu');
    expect(coordinateReadout(draft({ latitude: 'x' }), 'create').text).toContain('virgül');
    expect(coordinateReadout(draft({ latitude: '91' }), 'create').text).toContain('-90');
    expect(coordinateReadout(draft({ longitude: '181' }), 'create').text).toContain('-180');
    expect(coordinateReadout(draft(), 'create').ok).toBe(true);
  });

  it('reads back the stored pair in edit and admits when there is none', () => {
    expect(coordinateReadout(draft({ latitude: '40.5', longitude: '29.1' }), 'edit')).toEqual({
      text: 'WGS84 derece · 40.5, 29.1',
      ok: true,
    });
    expect(coordinateReadout(draft({ latitude: '', longitude: '' }), 'edit').ok).toBe(false);
  });

  it('agrees with checkProfile about whether a pair is usable', () => {
    for (const value of ['', ' ', 'x', '91', '-91', '0', '41.0082']) {
      const d = draft({ latitude: value });
      const readoutOk = coordinateReadout(d, 'create').ok;
      const profileOk = checkProfile(d, 'create').errors.latitude === undefined;
      expect(readoutOk, 'latitude ' + JSON.stringify(value)).toBe(profileOk);
    }
  });
});

describe('PROFILE_FIELDS', () => {
  it('lists every field exactly once, in visual order', () => {
    expect(PROFILE_FIELDS).toEqual([
      'name',
      'code',
      'address',
      'latitude',
      'longitude',
      'phone',
      'minOrder',
      'deliveryFee',
    ]);
    expect(new Set(PROFILE_FIELDS).size).toBe(PROFILE_FIELDS.length);
  });
});
