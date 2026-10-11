/**
 * Social proof formatting for the customer app.
 *
 * Mirrors `apps/storefront-web/src/lib/storefront/format.ts` so the same
 * payload renders the same way on both clients. The storefront home payload
 * already carries `socialProof.averageRatingBps` and `reviews[]`; these helpers
 * exist because mobile had no equivalent and therefore rendered neither.
 */

/** Basis points → a one-decimal rating, or `null` when there is nothing to show. */
export function formatRatingBps(bps: number | null): string | null {
  if (bps === null || !Number.isFinite(bps) || bps <= 0) return null;
  return (bps / 100).toLocaleString('tr-TR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Coarse relative time in Turkish. `now` is injectable so the thresholds can be
 * tested without freezing the clock.
 */
export function formatRelativeTr(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const deltaMs = now - then;
  const minutes = Math.round(deltaMs / 60000);
  if (minutes < 60) return 'Az önce';
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours <= 12 ? 'Bugün' : 'Dün';
  const days = Math.round(hours / 24);
  if (days === 1) return 'Dün';
  if (days < 7) return `${days} gün önce`;
  if (days < 14) return '1 hafta önce';
  return `${Math.round(days / 7)} hafta önce`;
}

/** Five-star row: filled stars for `rating`, empty for the remainder. */
export function starRow(rating: number): string {
  if (!Number.isFinite(rating)) return '';
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return `${'★'.repeat(filled)}${'☆'.repeat(5 - filled)}`;
}