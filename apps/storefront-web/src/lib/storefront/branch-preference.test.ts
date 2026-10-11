import { describe, expect, it } from 'vitest';

import {
  BRANCH_PREFERENCE_KEY,
  branchPreferenceStorage,
  readBranchPreference,
  writeBranchPreference,
} from './branch-preference';

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

function blockedStorage() {
  return {
    getItem: () => {
      throw new Error('storage blocked');
    },
    setItem: () => {
      throw new Error('quota exceeded');
    },
    removeItem: () => {
      throw new Error('storage blocked');
    },
  };
}

describe('readBranchPreference', () => {
  it('returns the stored branch id', () => {
    expect(readBranchPreference(memoryStorage({ [BRANCH_PREFERENCE_KEY]: 'branch-1' }))).toBe(
      'branch-1',
    );
  });

  it('returns null when nothing is stored', () => {
    expect(readBranchPreference(memoryStorage())).toBeNull();
  });

  it('returns null when storage is unavailable (server render)', () => {
    expect(readBranchPreference(null)).toBeNull();
  });

  it('returns null instead of throwing when storage is blocked', () => {
    expect(readBranchPreference(blockedStorage())).toBeNull();
  });
});

describe('writeBranchPreference', () => {
  it('persists the selected branch', () => {
    const storage = memoryStorage();
    writeBranchPreference(storage, 'branch-2');
    expect(storage.map.get(BRANCH_PREFERENCE_KEY)).toBe('branch-2');
  });

  it('clears the preference for null', () => {
    const storage = memoryStorage({ [BRANCH_PREFERENCE_KEY]: 'branch-2' });
    writeBranchPreference(storage, null);
    expect(storage.map.has(BRANCH_PREFERENCE_KEY)).toBe(false);
  });

  it('never throws when storage is unavailable', () => {
    expect(() => writeBranchPreference(blockedStorage(), 'branch-3')).not.toThrow();
  });
});

describe('branchPreferenceStorage', () => {
  it('is null outside the browser', () => {
    expect(branchPreferenceStorage()).toBeNull();
  });
});
