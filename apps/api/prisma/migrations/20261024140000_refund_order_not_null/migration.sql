-- Audit P0-1: a refund row is the financial record of a money movement and
-- must always be attributable to the order it was issued for.
--
-- Before this migration `refunds.order_id` was written as NULL by
-- `RefundService` and stayed nullable, so:
--   * branch-scoped revenue reporting (`ReportingService.sales()`) could not
--     attribute a refund to a branch and every refund stayed invisible in the
--     branch report, and
--   * the unfiltered report subtracted refunds that belonged to no order.
--
-- The migration `20261024130000_referential_integrity_fks` already added the
-- `refunds_order_id_fkey` foreign key. This migration closes the gap by
-- making the column NOT NULL.

-- 1) Backfill through `checkout_sessions.order_id`.
UPDATE "refunds" r
   SET "order_id" = cs."order_id"
  FROM "payment_attempts" pa
  JOIN "checkout_sessions" cs ON cs."id" = pa."checkout_session_id"
 WHERE r."order_id" IS NULL
   AND pa."id" = r."payment_id"
   AND cs."order_id" IS NOT NULL;

-- 2) Backfill through the other direction of the same link,
--    `orders.checkout_session_id`.
UPDATE "refunds" r
   SET "order_id" = o."id"
  FROM "payment_attempts" pa
  JOIN "orders" o ON o."checkout_session_id" = pa."checkout_session_id"
 WHERE r."order_id" IS NULL
   AND pa."id" = r."payment_id";

-- 3) Rows that still have no order are phantom records: they were written
--    with `order_id = NULL` by the pre-P0-1 code path, which also never
--    dispatched the refund to the payment provider. No money was returned
--    for them, so removing them loses no provider-side state and stops them
--    from silently reducing the net revenue of unrelated branches.
DELETE FROM "refunds" r
 WHERE r."order_id" IS NULL;

-- 4) The record is now always attributable to an order.
ALTER TABLE "refunds" ALTER COLUMN "order_id" SET NOT NULL;
