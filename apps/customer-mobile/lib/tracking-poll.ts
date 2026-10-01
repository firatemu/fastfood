export type TrackingPollDecision = 'poll' | 'pause' | 'stop';

export function decideTrackingPoll(input: {
  trackingActive: boolean;
  pollIntervalMs: number | null | undefined;
  appActive: boolean;
}): TrackingPollDecision {
  if (!input.trackingActive) return 'stop';
  if (!input.pollIntervalMs || input.pollIntervalMs <= 0) return 'stop';
  if (!input.appActive) return 'pause';
  return 'poll';
}

export type SupportPollPace = 'foreground' | 'background' | 'stop';

export function decideSupportPoll(input: {
  conversationId: string | null | undefined;
  appActive: boolean;
  mounted: boolean;
}): { pace: SupportPollPace; intervalMs: number | null } {
  if (!input.mounted || !input.conversationId) {
    return { pace: 'stop', intervalMs: null };
  }
  if (!input.appActive) {
    return { pace: 'background', intervalMs: 20_000 };
  }
  return { pace: 'foreground', intervalMs: 4_000 };
}
