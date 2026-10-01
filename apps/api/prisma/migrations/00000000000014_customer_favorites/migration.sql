-- Storefront Phase 5: persisted customer product favorites.
-- Local development only. No production migrations.

CREATE TABLE "customer_favorites" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "user_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_favorites_user_id_product_id_key"
  ON "customer_favorites"("user_id", "product_id");

CREATE INDEX "customer_favorites_user_id_idx"
  ON "customer_favorites"("user_id");

ALTER TABLE "customer_favorites"
  ADD CONSTRAINT "customer_favorites_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_favorites"
  ADD CONSTRAINT "customer_favorites_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
