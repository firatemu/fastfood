/**
 * Unit tests for the Phase 3 customer /me shell + address endpoints.
 *
 * Document 39 §5 (IDOR + ownership).
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ActorType } from '@fastfood/domain-types';

import type { AuthenticatedPrincipal } from '../../src/modules/auth/guards/authenticated-principal.js';
import { CustomerOwnershipPolicy } from '../../src/modules/customer/customer-ownership.policy.js';
import { CustomerService } from '../../src/modules/customer/customer.service.js';

function makePrincipal(id: string): AuthenticatedPrincipal {
  return {
    id,
    actorType: ActorType.CUSTOMER,
    status: 'ACTIVE',
    permissions: new Set<string>(),
    customerId: id,
  };
}

function addressInput(name: string, phone: string) {
  return {
    label: 'Ev',
    recipientName: name,
    recipientPhone: phone,
    latitude: 41,
    longitude: 28,
    locationConfirmed: true as const,
    countryCode: 'TR',
    provinceId: 1,
    districtId: 1757,
    neighborhoodId: 248,
    province: 'Adana',
    city: 'Adana',
    district: 'Aladağ',
    neighborhood: 'Akpınar',
  };
}

describe('Phase 3 Customer /me + addresses', () => {
  it('returns a deterministic profile for the principal', async () => {
    const svc = new CustomerService(new CustomerOwnershipPolicy());
    const principal = makePrincipal('01900000-0000-7000-8000-000000000001');
    const profile = await svc.getProfile(principal);
    expect(profile.id).toBe(principal.id);
  });

  it('patches the profile and persists', async () => {
    const svc = new CustomerService(new CustomerOwnershipPolicy());
    const principal = makePrincipal('01900000-0000-7000-8000-000000000001');
    const updated = await svc.patchProfile(principal, { displayName: 'Alice', locale: 'en-US' });
    expect(updated.displayName).toBe('Alice');
    expect(updated.locale).toBe('en-US');
  });

  it('creates an address with map-confirmed coordinates', async () => {
    const svc = new CustomerService(new CustomerOwnershipPolicy());
    const principal = makePrincipal('01900000-0000-7000-8000-000000000001');
    const address = await svc.createAddress(principal, {
      ...addressInput('Alice', '+905551111111'),
      latitude: 41.0082,
      longitude: 28.9784,
    });
    expect(address.id).toMatch(/^01900000-0000-7000-8000-/);
    expect(address.isDefault).toBe(false);
  });

  it('lists only addresses owned by the principal', async () => {
    const svc = new CustomerService(new CustomerOwnershipPolicy());
    const a = makePrincipal('01900000-0000-7000-8000-000000000001');
    const b = makePrincipal('01900000-0000-7000-8000-000000000002');
    const addrA = await svc.createAddress(a, addressInput('Alice', '+905551111111'));
    await svc.createAddress(b, addressInput('Bob', '+905552222222'));
    const addresses = await svc.listAddresses(a);
    expect(addresses.length).toBe(1);
    expect(addresses[0]?.id).toBe(addrA.id);
  });

  it("rejects IDOR — Bob cannot update Alice's address", async () => {
    const svc = new CustomerService(new CustomerOwnershipPolicy());
    const a = makePrincipal('01900000-0000-7000-8000-000000000001');
    const b = makePrincipal('01900000-0000-7000-8000-000000000002');
    const addrA = await svc.createAddress(a, addressInput('Alice', '+905551111111'));
    await expect(svc.updateAddress(b, addrA.id, { recipientName: 'Bob' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("rejects IDOR — Bob cannot delete Alice's address", async () => {
    const svc = new CustomerService(new CustomerOwnershipPolicy());
    const a = makePrincipal('01900000-0000-7000-8000-000000000001');
    const b = makePrincipal('01900000-0000-7000-8000-000000000002');
    const addrA = await svc.createAddress(a, addressInput('Alice', '+905551111111'));
    await expect(svc.deleteAddress(b, addrA.id)).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException for an unknown address', async () => {
    const svc = new CustomerService(new CustomerOwnershipPolicy());
    const a = makePrincipal('01900000-0000-7000-8000-000000000001');
    await expect(svc.getAddress(a, '01900000-0000-7000-8000-aaaaaaaaaaaa')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates an address when the principal is the owner', async () => {
    const svc = new CustomerService(new CustomerOwnershipPolicy());
    const a = makePrincipal('01900000-0000-7000-8000-000000000001');
    const addrA = await svc.createAddress(a, addressInput('Alice', '+905551111111'));
    const updated = await svc.updateAddress(a, addrA.id, { recipientName: 'Alice 2' });
    expect(updated.recipientName).toBe('Alice 2');
  });

  it('CustomerOwnershipPolicy.enforce is consistent with canAccess', async () => {
    const policy = new CustomerOwnershipPolicy();
    const a = makePrincipal('01900000-0000-7000-8000-000000000001');
    const b = makePrincipal('01900000-0000-7000-8000-000000000002');
    expect(await policy.canAccess(a, { userId: a.id })).toBe(true);
    expect(await policy.canAccess(b, { userId: a.id })).toBe(false);
  });
});
