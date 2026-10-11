/**
 * Persisted branch choice for the Storefront header switcher.
 *
 * The stored id is a convenience, never a contract: an unknown id simply lets
 * the API fall back to the default branch. Every access is guarded because
 * `localStorage` is unavailable during server rendering and throws outright in
 * some private-mode browsers.
 */

export const BRANCH_PREFERENCE_KEY = 'ff.branchId';

export type BranchPreferenceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function branchPreferenceStorage(): BranchPreferenceStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readBranchPreference(storage: BranchPreferenceStorage | null): string | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(BRANCH_PREFERENCE_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeBranchPreference(
  storage: BranchPreferenceStorage | null,
  branchId: string | null,
): void {
  if (!storage) return;
  try {
    if (branchId) storage.setItem(BRANCH_PREFERENCE_KEY, branchId);
    else storage.removeItem(BRANCH_PREFERENCE_KEY);
  } catch {
    // A blocked or full storage must never break branch switching.
  }
}
