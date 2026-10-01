import { describe, expect, it } from 'vitest';

import { CUSTOMER_CAPABILITY_REGISTRY } from './customer-capability-registry.js';
import {
  CustomerCapabilityRegistryError,
  validateCustomerCapabilityRegistry,
} from './customer-capability.js';

describe('customer capability registry', () => {
  it('accepts the seeded completed baseline', () => {
    const parsed = validateCustomerCapabilityRegistry(CUSTOMER_CAPABILITY_REGISTRY);
    expect(parsed.length).toBe(CUSTOMER_CAPABILITY_REGISTRY.length);
    expect(parsed.every((entry) => entry.webStatus !== 'MISSING')).toBe(true);
    expect(parsed.every((entry) => entry.mobileStatus !== 'MISSING')).toBe(true);
  });

  it('requires both client impact and status fields', () => {
    expect(() =>
      validateCustomerCapabilityRegistry([
        {
          id: 'broken',
          name: 'Broken',
          backend: 'none',
          webImpact: 'AUTOMATICALLY_SUPPORTED',
          webStatus: 'IMPLEMENTED',
        },
      ]),
    ).toThrow();
  });

  it('rejects MISSING in the completed baseline', () => {
    expect(() =>
      validateCustomerCapabilityRegistry([
        {
          id: 'ghost-feature',
          name: 'Ghost',
          backend: 'none',
          webImpact: 'CHANGE_REQUIRED',
          webStatus: 'MISSING',
          mobileImpact: 'CHANGE_REQUIRED',
          mobileStatus: 'IMPLEMENTED',
          notes: '',
        },
      ]),
    ).toThrow(CustomerCapabilityRegistryError);
  });

  it('rejects NOT_APPLICABLE as a workaround for EXTERNAL_PROVIDER_BLOCKED', () => {
    expect(() =>
      validateCustomerCapabilityRegistry([
        {
          id: 'blocked-push',
          name: 'Blocked push',
          backend: 'none',
          webImpact: 'NOT_APPLICABLE',
          webStatus: 'NOT_RELEVANT',
          mobileImpact: 'NOT_APPLICABLE',
          mobileStatus: 'EXTERNAL_PROVIDER_BLOCKED',
          notes: '',
        },
      ]),
    ).toThrow(/CHANGE_REQUIRED/);
  });

  it('keeps native push blocked as CHANGE_REQUIRED on Mobile', () => {
    const push = CUSTOMER_CAPABILITY_REGISTRY.find((entry) => entry.id === 'native-push');
    expect(push?.webImpact).toBe('NOT_APPLICABLE');
    expect(push?.mobileImpact).toBe('CHANGE_REQUIRED');
    expect(push?.mobileStatus).toBe('EXTERNAL_PROVIDER_BLOCKED');
  });

  it('records OAuth as not-relevant on both clients (removed from customer surfaces)', () => {
    const oauth = CUSTOMER_CAPABILITY_REGISTRY.find((entry) => entry.id === 'oauth-google-apple');
    expect(oauth?.webStatus).toBe('NOT_RELEVANT');
    expect(oauth?.mobileStatus).toBe('NOT_RELEVANT');
    expect(oauth?.webImpact).toBe('NOT_APPLICABLE');
    expect(oauth?.mobileImpact).toBe('NOT_APPLICABLE');
  });
});
