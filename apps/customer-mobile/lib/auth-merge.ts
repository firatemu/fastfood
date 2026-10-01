export async function mergeGuestCartAfterAuth(input: {
  guestSessionId: string;
  merge: (guestSessionId: string) => Promise<unknown>;
}): Promise<'merged' | 'skipped'> {
  if (!input.guestSessionId) return 'skipped';
  try {
    await input.merge(input.guestSessionId);
    return 'merged';
  } catch {
    return 'skipped';
  }
}
