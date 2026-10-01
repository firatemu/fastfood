import type { CustomerPreference } from './schemas';

export type PreferenceToggles = {
  marketingOptIn: boolean;
  newsletterOptIn: boolean;
  orderUpdatesOptIn: boolean;
};

export function preferenceToToggles(pref: CustomerPreference): PreferenceToggles {
  return {
    marketingOptIn: pref.marketingOptIn,
    newsletterOptIn: pref.newsletterOptIn,
    orderUpdatesOptIn: pref.orderUpdatesOptIn,
  };
}

export function preferencePatchFromToggles(
  next: PreferenceToggles,
  original: CustomerPreference,
): Partial<PreferenceToggles> | null {
  const patch: Partial<PreferenceToggles> = {};
  if (next.marketingOptIn !== original.marketingOptIn) patch.marketingOptIn = next.marketingOptIn;
  if (next.newsletterOptIn !== original.newsletterOptIn) patch.newsletterOptIn = next.newsletterOptIn;
  if (next.orderUpdatesOptIn !== original.orderUpdatesOptIn) {
    patch.orderUpdatesOptIn = next.orderUpdatesOptIn;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}
