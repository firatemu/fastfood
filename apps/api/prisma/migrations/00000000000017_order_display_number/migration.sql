-- Order display numbers — short human-readable order ids in the SP##### form.
-- The first order seeded before this migration is retroactively numbered SP00001.

ALTER TABLE "orders"
  ADD COLUMN "display_number" VARCHAR(16);

-- Backfill legacy rows with sequential numbers ordered by created_at + id.
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM "orders"
)
UPDATE "orders" o
SET "display_number" = 'SP' || lpad(ordered.rn::text, 5, '0')
FROM ordered
WHERE o.id = ordered.id;

ALTER TABLE "orders"
  ALTER COLUMN "display_number" SET NOT NULL,
  ALTER COLUMN "display_number" SET DEFAULT 'SP00001';

CREATE UNIQUE INDEX "orders_display_number_key" ON "orders" ("display_number");
