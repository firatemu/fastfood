# Database and Prisma Conventions

## 1. Source of truth

During implementation, `apps/api/prisma/schema.prisma` (or the final documented canonical Prisma path) is the technical schema source of truth. This document governs its conventions.

## 2. Mapping

Application/Prisma names remain idiomatic TypeScript while physical PostgreSQL names use snake_case.

Example:

```prisma
model OrderItem {
  id             String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  orderId        String @map("order_id") @db.Uuid
  unitPriceMinor BigInt @map("unit_price_minor") @db.BigInt

  @@map("order_items")
}
```

## 3. Tables

Use plural `snake_case` physical table names:

- `orders`
- `order_items`
- `order_events`
- `payment_attempts`
- `loyalty_ledger_entries`

Join tables use clear relationship names rather than opaque abbreviations.

## 4. IDs

Use PostgreSQL UUID columns with UUIDv7 generation. Core persisted primary IDs use the PostgreSQL 18 database default `uuidv7()`; Prisma maps these defaults explicitly (including raw SQL migration statements when Prisma schema syntax cannot express a migration detail by itself).

No auto-increment integer public primary IDs for core entities. No module may silently switch core IDs to UUIDv4/ULID/integer.

## 5. Money

Use integer minor-unit columns:

```text
subtotal_minor
discount_minor
delivery_fee_minor
loyalty_redeemed_minor
total_minor
```

Canonical monetary persistence is locked as follows:

- PostgreSQL column type: `BIGINT`
- Prisma scalar: `BigInt` with `@db.BigInt` where explicit native annotation is appropriate
- TypeScript domain representation: `bigint`
- JSON/API representation: base-10 integer string in minor units, e.g. `"12990"` = 129.90 TRY
- UI formatted representation: derived only through shared money-formatting utilities

Using Prisma `Int`, PostgreSQL `INTEGER`, JavaScript floating-point values, or decimal major-unit strings as the canonical money representation is forbidden unless an ADR replaces this project-wide contract.

## 6. Decimal exception

Percentages/rates may use integer basis points or fixed decimal according to the owning domain contract. Monetary totals themselves are never floating point.

Baseline loyalty earn rate representation: basis points (`500` = 5.00%).

## 7. Timestamps

Use timezone-aware PostgreSQL timestamps for instants. Naming:

- `created_at`
- `updated_at`
- `verified_at`
- `delivered_at`

## 8. Enums

Use Prisma/PostgreSQL enums only for stable bounded state sets. Do not use an enum for values expected to be admin-extensible.

## 9. Foreign keys

Use explicit relations and database foreign keys for canonical relationships. Cascade deletion must be deliberate; it is not the default for financial/order history.

## 10. Unique constraints

Examples:

- provider payment reference where provider guarantees uniqueness,
- idempotency key scoped appropriately,
- role/permission code,
- order human reference if globally unique,
- active session token hash identifiers.

## 11. Spatial data

PostGIS geometry fields may require Prisma `Unsupported(...)` fields and SQL migrations/raw queries. Spatial SQL lives in dedicated infrastructure repositories and always uses parameter binding.

## 12. Migrations

- migrations are committed,
- no production `db push`,
- schema changes require migration,
- destructive changes require staged migration plan,
- migration filenames/descriptions are meaningful,
- CI validates migration consistency.

## 13. Seed

Seed data is deterministic and environment-aware. Production seed must never create default privileged credentials with known passwords.
