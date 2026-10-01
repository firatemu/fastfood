# Database Entity Catalog

This catalog defines canonical entity intent. Exact implementation columns are governed by `schema.prisma` and document 35 once coding begins.

## Identity and authorization

### User
Staff/customer identity record or separated identity subtype according to schema design. Must preserve actor type and status.

### StaffProfile
Staff-specific information and employment/operational state.

### CustomerProfile
Customer name/contact/account metadata.

### Session
Revocable session/refresh-token metadata; refresh token stored hashed.

### Role
Named permission bundle.

### Permission
Stable dotted permission code.

### UserRole
Role assignment to staff identity.

### UserBranchScope
Authorized branch scope assignment.

## Customer/address

### Address
Map-confirmed saved delivery address with coordinates.

## Catalog

### Category
Catalog grouping.

### Product
Core product content.

### ProductMedia
Multiple ordered images/media.

### ProductVariant
Base selectable purchasable variant.

### ModifierGroup
Selection constraint group.

### Modifier
Individual add-on/choice.

### ProductModifierGroup
Product-to-group relation and overrides.

### IngredientRemovalOption
Explicit removable ingredient choice.

### Allergen
Central allergen definition.

### ProductAllergen
Product-to-allergen relation.

### BranchProductAvailability
Per-branch temporary/permanent availability override.

## Branch/geography

### Branch
Physical fulfillment branch.

### BranchOperatingHours
Weekly/special operating schedule.

### ServiceArea
PostGIS polygon/multipolygon and routing metadata.

## Checkout/payment

### CheckoutSession
Server-side checkout state and quote context.

### PaymentAttempt
One provider payment attempt.

### Refund
Full/partial provider refund record.

### IdempotencyRecord
Where needed, protects retryable mutation keys/results.

## Order

### Order
Canonical order aggregate root.

### OrderItem
Purchase-time product snapshot line.

### OrderItemModifier
Purchase-time modifier snapshot.

### OrderItemRemoval
Purchase-time removal snapshot.

### OrderEvent
Timeline/state transition event.

### OrderBranchAssignment
History of branch assignment/reassignment.

## Loyalty

### LoyaltyLedgerEntry
Immutable credit/debit/reservation/compensation entry.

### LoyaltyReservation
Active reservation metadata for checkout.

## Promotions

### Promotion
Promotion/coupon definition.

### PromotionRedemption
Usage record.

## Courier/delivery

### CourierProfile
Courier-specific operational profile.

### Delivery
Order-delivery aggregate/state.

### DeliveryAssignment
Courier assignment history.

### CourierLocationPoint
Short-retention raw location point for active delivery.

### QrClaimToken
Secure token metadata/hash where persistence is required.

## Notifications

### Notification
Logical notification request/status.

### PushDevice
Device push token/session association.

## Platform

### AuditLog
Immutable critical action record.

### BusinessSetting
Typed mutable business configuration where admin-editable.

### OutboxEvent
Durable event for transactionally safe asynchronous publication.

### MediaAsset
Storage metadata shared by catalog/media workflows.

## Entity rules

- All core IDs use UUIDv7.
- Monetary columns use integer minor units.
- Timestamps use UTC.
- Database identifiers use snake_case mapping.
- Historical order/payment/loyalty/audit data is not casually deleted.
- Raw location has explicit retention.
