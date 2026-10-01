/**
 * Authoritative Club defaults. Runtime tiers/welcome/spin live in the
 * database; these values apply when the store is empty (unit tests) and
 * as seed defaults. Do not copy thresholds into React.
 *
 * Qualification metric: lifetime *earned* points (sum of positive ledger
 * deltas excluding RELEASE / REDEMPTION_RESTORED). Current spendable
 * balance is a separate number.
 *
 * Document 36: 100 points = 1.00 TRY. Welcome default 5000 points is
 * therefore 50.00 TRY of Club redemption value — configurable, not
 * Stitch copy.
 */

export interface ClubTierDefinition {
  code: string;
  displayName: string;
  minLifetimeEarnedPoints: bigint;
  sortOrder: number;
}

export const DEFAULT_CLUB_TIERS: readonly ClubTierDefinition[] = [
  { code: 'KOR', displayName: 'Kor', minLifetimeEarnedPoints: 0n, sortOrder: 0 },
  { code: 'ATES', displayName: 'Ateş', minLifetimeEarnedPoints: 500n, sortOrder: 1 },
  { code: 'MASTER', displayName: 'Master', minLifetimeEarnedPoints: 2500n, sortOrder: 2 },
];

export const WELCOME_PROMOTION_CODE = 'BHCLUBWELCOME';
export const WELCOME_PROMOTION_NAME = 'BURGER HOME CLUB Hoş Geldin';

export function welcomeRewardMinor(): bigint {
  const raw = process.env.CLUB_WELCOME_REWARD_MINOR;
  if (raw && /^\d+$/.test(raw)) return BigInt(raw);
  return 5000n;
}

export function welcomeValidDays(): number {
  const raw = Number(process.env.CLUB_WELCOME_VALID_DAYS ?? '90');
  return Number.isFinite(raw) && raw > 0 ? raw : 90;
}

export const CUSTOMER_SAFE_LEDGER_REASONS = new Set([
  'welcome_reward',
  'spin_reward',
  'order_earn',
  'checkout_reserve',
  'checkout_release',
  'set_balance',
  'adjustment',
]);

export const LIFETIME_EXCLUDE_TYPES = new Set(['RELEASE', 'REDEMPTION_RESTORED']);
