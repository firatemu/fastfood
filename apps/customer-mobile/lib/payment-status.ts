import {
  PAYMENT_TERMINAL_STATUSES,
  isPaymentTerminalStatus,
  type PaymentTerminalStatus,
} from '@fastfood/contracts';

export { PAYMENT_TERMINAL_STATUSES, isPaymentTerminalStatus, type PaymentTerminalStatus };

export function shouldPollPayment(input: {
  status: string;
  appState: string;
  mounted: boolean;
}): boolean {
  if (!input.mounted) return false;
  if (input.appState !== 'active') return false;
  return !isPaymentTerminalStatus(input.status);
}

export function postPaymentNavigation(
  status: string,
  orderId: string | null,
): { kind: 'confirmation' | 'failed' | 'pending'; href: string | null } {
  if (status === 'PAID' && orderId) {
    return { kind: 'confirmation', href: `/orders/${orderId}/confirmation` };
  }
  if (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED') {
    return { kind: 'failed', href: '/checkout' };
  }
  return { kind: 'pending', href: null };
}
