# Glossary and Canonical Terms

Use these terms consistently in code, API, documentation, and prompts.

## Branch

A physical restaurant/fulfillment location belonging to the single FASTFOOD organization.

## Service Area

A configured geographic area used to determine delivery eligibility and branch routing.

## Customer

A registered end-user account. A guest purchaser is not automatically a Customer account.

## Staff User

An internal operational identity such as admin, branch operator, or courier.

## Courier

A staff user/profile authorized for delivery operations.

## Product

Customer-facing catalog item.

## Variant

A base purchasable option of a product, e.g. 100 g / 130 g.

## Modifier Group

A group defining selectable additions/options and min/max constraints.

## Modifier

An individual selectable option, possibly with price effect.

## Removal

A removable ingredient selection with no negative price effect in V1.

## Cart Line

A configured product + variant/modifiers/removals + quantity entry.

## Checkout Session

Server-side state coordinating quote, address/branch, loyalty reservation, and payment initiation before final order confirmation.

## Quote

Authoritative server pricing/serviceability result valid for a limited period.

## Payment Attempt

One attempt to collect a defined amount through a payment provider.

## Order

The commercial/fulfillment aggregate created/confirmed from a successful checkout according to payment rules.

## Delivery

The courier fulfillment record associated with an order.

## Loyalty Reservation

Temporarily unavailable points reserved for a checkout until payment succeeds/fails/expires.

## Loyalty Ledger

Immutable sequence of point credits/debits/reservations/compensations from which balance is auditable.

## Permission

A stable capability such as `orders.read`.

## Role

A named bundle of permissions.

## Scope

Resource boundary restricting where a permission applies, e.g. specific branches or own courier deliveries.

## Design Token

Central visual value or semantic alias consumed by shared components.

## Minor Unit

Smallest currency unit used for calculation; for TRY this is kuruş. Example 1.00 TRY = 100 minor units.

## Idempotency

Property that retrying the same logical operation does not create additional unintended side effects.

## Correlation ID

Identifier used to connect requests, jobs, provider calls, and logs for troubleshooting.

## ADR

Architecture Decision Record documenting an intentional significant technical decision/change.
