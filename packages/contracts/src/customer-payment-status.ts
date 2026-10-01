/** Customer checkout payment statuses that stop polling. Shared by Web and Mobile. */

export const PAYMENT_TERMINAL_STATUSES = ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED'] as const;

export type PaymentTerminalStatus = (typeof PAYMENT_TERMINAL_STATUSES)[number];

export function isPaymentTerminalStatus(status: string): boolean {
  return (PAYMENT_TERMINAL_STATUSES as readonly string[]).includes(status);
}
