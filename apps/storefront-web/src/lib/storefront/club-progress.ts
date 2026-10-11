/**
 * Tier-progress derivation for the loyalty screen.
 *
 * The backend already sends `progressBps` and `pointsToNextTier`, so this does
 * not invent numbers — it clamps and interprets them, so the UI can never
 * render a bar wider than its track or claim progress while sitting at the top
 * tier. Pure so those invariants are unit-tested rather than eyeballed.
 */

export type ClubProgress = {
  /** 0..100, always within the track. */
  percent: number;
  /** 0..1, raw fraction for the bar width. */
  ratio: number;
  /** Never negative, even if the backend sends a negative remainder. */
  pointsRemaining: number;
  /** True when the account is on the highest tier. */
  atMaxTier: boolean;
  /** True when there is a next tier AND progress worth showing. */
  showRail: boolean;
};

export function clubProgress(input: {
  /**
   * `progressBps` is a number on the wire; `pointsToNextTier` is a string
   * because points follow the repo's BigInt-as-string contract. Both accept
   * either so the caller never has to pre-convert.
   */
  progressBps: number | string | null | undefined;
  pointsToNextTier: number | string | null | undefined;
  hasNextTier: boolean;
}): ClubProgress {
  const raw = Number(input.progressBps);
  const bps = Number.isFinite(raw) ? raw : 0;
  const ratio = Math.min(1, Math.max(0, bps / 10_000));
  const percent = Math.round(ratio * 100);

  const rawRemaining = Number(input.pointsToNextTier);
  const pointsRemaining = Number.isFinite(rawRemaining) ? Math.max(0, Math.trunc(rawRemaining)) : 0;

  const atMaxTier = input.hasNextTier !== true;

  return {
    percent,
    ratio,
    pointsRemaining,
    atMaxTier,
    showRail: !atMaxTier,
  };
}