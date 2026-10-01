import { describe, expect, it } from 'vitest';

import { decideSupportPoll, decideTrackingPoll } from './tracking-poll';

describe('tracking poll lifecycle', () => {
  it('stops when tracking is inactive or interval is missing', () => {
    expect(
      decideTrackingPoll({ trackingActive: false, pollIntervalMs: 4000, appActive: true }),
    ).toBe('stop');
    expect(
      decideTrackingPoll({ trackingActive: true, pollIntervalMs: null, appActive: true }),
    ).toBe('stop');
  });

  it('pauses in background and polls while active', () => {
    expect(
      decideTrackingPoll({ trackingActive: true, pollIntervalMs: 5000, appActive: false }),
    ).toBe('pause');
    expect(
      decideTrackingPoll({ trackingActive: true, pollIntervalMs: 5000, appActive: true }),
    ).toBe('poll');
  });
});

describe('support poll lifecycle', () => {
  it('uses 4s foreground and 20s background, and stops when unmounted', () => {
    expect(decideSupportPoll({ conversationId: 'c1', appActive: true, mounted: true })).toEqual({
      pace: 'foreground',
      intervalMs: 4000,
    });
    expect(decideSupportPoll({ conversationId: 'c1', appActive: false, mounted: true })).toEqual({
      pace: 'background',
      intervalMs: 20000,
    });
    expect(decideSupportPoll({ conversationId: 'c1', appActive: true, mounted: false }).pace).toBe(
      'stop',
    );
  });
});
