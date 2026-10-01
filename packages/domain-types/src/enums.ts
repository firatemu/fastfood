/**
 * Domain enums shared across API, web, and mobile.
 *
 * Stable values only. New values are added via ADR. Removing or renaming values
 * is a breaking API change and must go through document 46.
 */

export const OrderState = {
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAID: 'PAID',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  BRANCH_ASSIGNED: 'BRANCH_ASSIGNED',
  BRANCH_ACCEPTED: 'BRANCH_ACCEPTED',
  PREPARING: 'PREPARING',
  READY_FOR_COURIER: 'READY_FOR_COURIER',
  COURIER_ASSIGNED: 'COURIER_ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  ON_THE_WAY: 'ON_THE_WAY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
} as const;
export type OrderState = (typeof OrderState)[keyof typeof OrderState];

export const PaymentAttemptStatus = {
  INITIALIZED: 'INITIALIZED',
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentAttemptStatus = (typeof PaymentAttemptStatus)[keyof typeof PaymentAttemptStatus];

export const LoyaltyEntryKind = {
  EARN: 'EARN',
  RESERVE: 'RESERVE',
  RELEASE: 'RELEASE',
  REDEEM: 'REDEEM',
  ADJUSTMENT: 'ADJUSTMENT',
  EXPIRE: 'EXPIRE',
} as const;
export type LoyaltyEntryKind = (typeof LoyaltyEntryKind)[keyof typeof LoyaltyEntryKind];

export const ActorType = {
  CUSTOMER: 'CUSTOMER',
  STAFF: 'STAFF',
  COURIER: 'COURIER',
  SYSTEM: 'SYSTEM',
  GUEST: 'GUEST',
} as const;
export type ActorType = (typeof ActorType)[keyof typeof ActorType];

export const IdentifierType = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  STAFF_USERNAME: 'STAFF_USERNAME',
} as const;
export type IdentifierType = (typeof IdentifierType)[keyof typeof IdentifierType];
