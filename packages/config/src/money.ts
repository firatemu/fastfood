/**
 * Canonical money representation across the monorepo.
 *
 * Document 37 / manifest.json locks:
 *   - database:  PostgreSQL BIGINT
 *   - prisma:    BigInt
 *   - typescript: bigint
 *   - json:      base-10 integer string in minor units (kuruş)
 *
 * This module is the single source of truth for parsing/serializing money at
 * the JSON boundary. Application code MUST go through these helpers instead of
 * calling Number(...) on string money values.
 */

const MINOR_UNITS_REGEX = /^-?\d+$/;

export class InvalidMoneyStringError extends Error {
  constructor(value: unknown) {
    super(`Invalid money string: expected base-10 integer minor units, got ${String(value)}`);
    this.name = 'InvalidMoneyStringError';
  }
}

/**
 * Parse a JSON/API money value (base-10 integer minor units) into a bigint.
 * Throws if the value is not a clean integer string.
 */
export function moneyFromMinorString(value: string | null | undefined): bigint {
  if (value === null || value === undefined) {
    throw new InvalidMoneyStringError(value);
  }
  if (typeof value !== 'string' || !MINOR_UNITS_REGEX.test(value)) {
    throw new InvalidMoneyStringError(value);
  }
  return BigInt(value);
}

/**
 * Serialize a bigint money value to its canonical JSON representation
 * (base-10 integer minor units as a string).
 */
export function moneyToMinorString(value: bigint): string {
  return value.toString();
}

/**
 * Add two money minor-unit bigints without precision loss.
 */
export function addMoney(...values: bigint[]): bigint {
  return values.reduce<bigint>((acc, next) => acc + next, 0n);
}

/**
 * Subtract two money minor-unit bigints without precision loss.
 */
export function subMoney(a: bigint, b: bigint): bigint {
  return a - b;
}

/**
 * Project-defined: half-up rounding to the nearest minor unit for non-negative values.
 *
 *   roundedAmount = floor((baseMinor * rateBps + 5000) / 10000)
 *
 * See document 37 §10.
 */
export function applyRateBps(baseMinor: bigint, rateBps: number): bigint {
  if (rateBps < 0) {
    throw new Error(`rateBps must be non-negative, got ${rateBps}`);
  }
  if (baseMinor < 0n) {
    throw new Error('applyRateBps is only defined for non-negative baseMinor');
  }
  const numerator = baseMinor * BigInt(rateBps) + 5000n;
  return numerator / 10000n;
}
