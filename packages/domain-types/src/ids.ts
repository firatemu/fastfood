/**
 * Branded ID types. These are nominal types that prevent accidental mixing of
 * IDs from different domains. They are zero-cost at runtime (just string aliases
 * at the type level).
 *
 * Canonical ID generation happens at the database default (PostgreSQL 18 `uuidv7()`).
 * See documents 16 §3 + 35 §4.
 */
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type CustomerId = Brand<string, 'CustomerId'>;
export type StaffId = Brand<string, 'StaffId'>;
export type CourierId = Brand<string, 'CourierId'>;
export type BranchId = Brand<string, 'BranchId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type OrderItemId = Brand<string, 'OrderItemId'>;
export type CartId = Brand<string, 'CartId'>;
export type AddressId = Brand<string, 'AddressId'>;
export type CheckoutSessionId = Brand<string, 'CheckoutSessionId'>;
export type PaymentAttemptId = Brand<string, 'PaymentAttemptId'>;
export type RefundId = Brand<string, 'RefundId'>;
export type LoyaltyLedgerEntryId = Brand<string, 'LoyaltyLedgerEntryId'>;
export type LoyaltyReservationId = Brand<string, 'LoyaltyReservationId'>;
export type DeliveryId = Brand<string, 'DeliveryId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type RoleId = Brand<string, 'RoleId'>;
export type PermissionId = Brand<string, 'PermissionId'>;
export type ServiceAreaId = Brand<string, 'ServiceAreaId'>;
export type ModifierGroupId = Brand<string, 'ModifierGroupId'>;
export type ModifierId = Brand<string, 'ModifierId'>;
export type AllergenId = Brand<string, 'AllergenId'>;
export type AuditLogId = Brand<string, 'AuditLogId'>;
export type MediaAssetId = Brand<string, 'MediaAssetId'>;
export type QrClaimTokenId = Brand<string, 'QrClaimTokenId'>;
export type RequestId = Brand<string, 'RequestId'>;
export type CorrelationId = Brand<string, 'CorrelationId'>;

/**
 * Convenience cast for trusted server-side UUIDv7 strings.
 * Validation must occur at the API boundary, not here.
 */
export function asId<T extends Brand<string, string>>(value: string): T {
  return value as T;
}
