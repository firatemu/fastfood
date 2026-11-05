-- Order display numbers — replace the constant default with a sequence.
--
-- Audit P1-1: `orders.display_number` had a *constant* DEFAULT 'SP00001'.
-- Two consequences:
--   1. Any order created without an explicit display number collided with
--      the first order (unique index `orders_display_number_key`) — a P2002
--      on the insert path, after the customer had already paid.
--   2. `OrderService.#nextDisplayNumber()` computed "max + 1" from a
--      separate SELECT, so two concurrent checkouts computed the same
--      number and one of them failed with P2002.
--
-- A sequence makes the number allocation atomic inside the INSERT, which
-- removes both problems: no read-modify-write race and no constant default.
--
-- The sequence is seeded above the current maximum so existing orders keep
-- their numbers and new ones continue from there.

CREATE SEQUENCE IF NOT EXISTS "order_display_number_seq";

-- Continue the sequence above the highest number already in use.
SELECT setval(
  'order_display_number_seq',
  GREATEST(
    COALESCE(
      (
        SELECT MAX(NULLIF(regexp_replace("display_number", '^SP', ''), '')::bigint)
          FROM "orders"
         WHERE "display_number" ~ '^SP[0-9]+$'
      ),
      0
    ),
    1
  ),
  true
);

ALTER TABLE "orders"
  ALTER COLUMN "display_number"
  SET DEFAULT ('SP' || lpad(nextval('order_display_number_seq')::text, 5, '0'));

ALTER SEQUENCE "order_display_number_seq" OWNED BY "orders"."display_number";
