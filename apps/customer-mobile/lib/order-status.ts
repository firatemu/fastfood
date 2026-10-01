import {
  CUSTOMER_ORDER_PHASES,
  mapOrderStatusToPhaseIndex,
  mapOrderStatusToStitchStepperIndex,
} from '@fastfood/contracts';

export { CUSTOMER_ORDER_PHASES, mapOrderStatusToPhaseIndex, mapOrderStatusToStitchStepperIndex };

export function isNegativeTrackerKind(kind: string | undefined): boolean {
  return kind === 'cancelled' || kind === 'rejected' || kind === 'failed';
}

export function isTerminalNegativeStatus(status: string): boolean {
  return mapOrderStatusToStitchStepperIndex(status) < 0;
}
