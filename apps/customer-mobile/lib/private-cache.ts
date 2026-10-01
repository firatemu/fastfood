import { fetchCart } from './cart';
import { clearPaymentSummary } from './payment-session';
import type {
  ClubSnapshot,
  CustomerAddress,
  CustomerPreference,
  CustomerProfile,
  Favorite,
  InboxNotification,
  LinkedIdentities,
} from './schemas';

let profile: CustomerProfile | null = null;
let preferences: CustomerPreference | null = null;
let addresses: CustomerAddress[] | null = null;
let identities: LinkedIdentities | null = null;
let loyaltyPoints: string | null = null;
let favorites: Favorite[] | null = null;
let club: ClubSnapshot | null = null;
let notifications: InboxNotification[] | null = null;

export function cacheProfile(next: CustomerProfile | null): void {
  profile = next;
}

export function readCachedProfile(): CustomerProfile | null {
  return profile;
}

export function cachePreferences(next: CustomerPreference | null): void {
  preferences = next;
}

export function readCachedPreferences(): CustomerPreference | null {
  return preferences;
}

export function cacheAddresses(next: CustomerAddress[] | null): void {
  addresses = next;
}

export function readCachedAddresses(): CustomerAddress[] | null {
  return addresses;
}

export function cacheIdentities(next: LinkedIdentities | null): void {
  identities = next;
}

export function readCachedIdentities(): LinkedIdentities | null {
  return identities;
}

export function cacheLoyaltyPoints(next: string | null): void {
  loyaltyPoints = next;
}

export function readCachedLoyaltyPoints(): string | null {
  return loyaltyPoints;
}

export function cacheFavorites(next: Favorite[] | null): void {
  favorites = next;
}

export function readCachedFavorites(): Favorite[] | null {
  return favorites;
}

export function cacheClub(next: ClubSnapshot | null): void {
  club = next;
}

export function readCachedClub(): ClubSnapshot | null {
  return club;
}

export function cacheNotifications(next: InboxNotification[] | null): void {
  notifications = next;
}

export function readCachedNotifications(): InboxNotification[] | null {
  return notifications;
}

/** Drop private customer material. Catalog is untouched. Coupon/table context is not identity. */
export function clearPrivateCustomerCache(): void {
  profile = null;
  preferences = null;
  addresses = null;
  identities = null;
  loyaltyPoints = null;
  favorites = null;
  club = null;
  notifications = null;
  clearPaymentSummary();
}

export async function refreshPublicCartAfterAuthChange(): Promise<void> {
  try {
    await fetchCart();
  } catch {
    // Guest cart may be empty.
  }
}
