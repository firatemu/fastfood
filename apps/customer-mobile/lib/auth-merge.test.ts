import { describe, expect, it } from 'vitest';

import { mergeGuestCartAfterAuth } from './auth-merge';

describe('guest cart merge orchestration', () => {
  it('calls backend merge with the prior guest id', async () => {
    const seen: string[] = [];
    const result = await mergeGuestCartAfterAuth({
      guestSessionId: 'guest-abc',
      merge: async (id) => {
        seen.push(id);
      },
    });
    expect(result).toBe('merged');
    expect(seen).toEqual(['guest-abc']);
  });

  it('skips when the backend merge fails (empty guest cart is expected)', async () => {
    const result = await mergeGuestCartAfterAuth({
      guestSessionId: 'guest-abc',
      merge: async () => {
        throw new Error('empty');
      },
    });
    expect(result).toBe('skipped');
  });
});
