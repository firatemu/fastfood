import type { CourierDeliveryStatus } from '@fastfood/contracts';
import { describe, expect, it } from 'vitest';

import {
  DELIVERY_LIFECYCLE,
  NEXT_ACTIONS,
  STATUS_LABELS,
  STATUS_SHORT_LABELS,
  STATUS_TONES,
  isTerminalStatus,
  lifecycleStepIndex,
  nextActionFor,
  statusLabel,
} from './status';

const ALL_STATUSES: CourierDeliveryStatus[] = [
  'UNASSIGNED',
  'ASSIGNED',
  'PICKED_UP',
  'ON_THE_WAY',
  'DELIVERED',
  'CANCELLED',
];

describe('courier delivery status rules', () => {
  it('offers exactly one transition out of every non-terminal status', () => {
    expect(nextActionFor('ASSIGNED')?.path).toBe('pickup');
    expect(nextActionFor('PICKED_UP')?.path).toBe('on-the-way');
    expect(nextActionFor('ON_THE_WAY')?.path).toBe('deliver');
  });

  it('offers no transition out of a terminal status', () => {
    // The defect this module exists to prevent: showing `deliver` while the
    // delivery is still ASSIGNED would let the lifecycle be skipped.
    expect(nextActionFor('UNASSIGNED')).toBeUndefined();
    expect(nextActionFor('DELIVERED')).toBeUndefined();
    expect(nextActionFor('CANCELLED')).toBeUndefined();
  });

  it('cannot skip the lifecycle from ASSIGNED straight to DELIVERED', () => {
    const action = nextActionFor('ASSIGNED');
    expect(action).toBeDefined();
    expect(action?.path).not.toBe('deliver');
  });

  it('exposes exactly three actions, one per in-flight status', () => {
    expect(Object.keys(NEXT_ACTIONS).sort()).toEqual(['ASSIGNED', 'ON_THE_WAY', 'PICKED_UP']);
  });

  it('marks terminal statuses as terminal', () => {
    expect(isTerminalStatus('ASSIGNED')).toBe(false);
    expect(isTerminalStatus('PICKED_UP')).toBe(false);
    expect(isTerminalStatus('ON_THE_WAY')).toBe(false);
    expect(isTerminalStatus('DELIVERED')).toBe(true);
    expect(isTerminalStatus('CANCELLED')).toBe(true);
    expect(isTerminalStatus('UNASSIGNED')).toBe(true);
  });

  it('never renders a raw enum value to the courier', () => {
    for (const status of ALL_STATUSES) {
      expect(statusLabel(status)).toBe(STATUS_LABELS[status]);
      expect(statusLabel(status)).not.toBe(status);
      expect(statusLabel(status)).toMatch(/\p{L}/u);
      expect(STATUS_SHORT_LABELS[status]).not.toBe(status);
    }
  });

  it('gives the two terminal outcomes distinct tones', () => {
    expect(STATUS_TONES.DELIVERED).toBe('completed');
    expect(STATUS_TONES.CANCELLED).toBe('cancelled');
    expect(STATUS_TONES.DELIVERED).not.toBe(STATUS_TONES.CANCELLED);
  });

  it('defines a label and a tone for every contract status', () => {
    for (const status of ALL_STATUSES) {
      expect(STATUS_LABELS[status]).toBeTruthy();
      expect(STATUS_TONES[status]).toBeTruthy();
    }
  });

  it('advances the stepper one step at a time', () => {
    expect(lifecycleStepIndex('ASSIGNED')).toBe(0);
    expect(lifecycleStepIndex('PICKED_UP')).toBe(1);
    expect(lifecycleStepIndex('ON_THE_WAY')).toBe(2);
  });

  it('completes every step once delivered and completes none when cancelled', () => {
    expect(lifecycleStepIndex('DELIVERED')).toBe(DELIVERY_LIFECYCLE.length);
    expect(lifecycleStepIndex('CANCELLED')).toBe(-1);
    expect(lifecycleStepIndex('UNASSIGNED')).toBe(-1);
  });

  it('never advances the stepper beyond the number of steps', () => {
    for (const status of ALL_STATUSES) {
      expect(lifecycleStepIndex(status)).toBeLessThanOrEqual(DELIVERY_LIFECYCLE.length);
      expect(lifecycleStepIndex(status)).toBeGreaterThanOrEqual(-1);
    }
  });
});