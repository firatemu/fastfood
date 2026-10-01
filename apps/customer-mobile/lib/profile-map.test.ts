import { describe, expect, it } from 'vitest';

import { profileFormToPatch, profileToForm } from './profile-map';

describe('profile form mapping', () => {
  it('emits only changed backend-permitted fields', () => {
    const original = {
      id: 'cust-1',
      displayName: 'Eski',
      email: 'eski@example.com',
      locale: 'tr-TR',
    };
    const form = profileToForm(original);
    form.displayName = 'Yeni Ad';
    const result = profileFormToPatch(form, original);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch).toEqual({ displayName: 'Yeni Ad' });
    }
  });

  it('rejects empty name and invalid email', () => {
    const original = { id: 'cust-1', displayName: 'Eski', email: null, locale: 'tr-TR' };
    expect(profileFormToPatch({ displayName: '', email: '', locale: 'tr-TR' }, original).ok).toBe(
      false,
    );
    expect(
      profileFormToPatch({ displayName: 'Eski', email: 'not-an-email', locale: 'tr-TR' }, original)
        .ok,
    ).toBe(false);
  });
});
