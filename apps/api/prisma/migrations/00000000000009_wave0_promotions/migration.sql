-- Wave 0: promotions + coupon redemptions (document 11 / 31).

CREATE TYPE "promotion_kind" AS ENUM ('FIXED_CART_MINOR', 'PERCENT_CART', 'DELIVERY_FEE_WAIVER');

CREATE TABLE "promotions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "code" VARCHAR(64),
    "name" VARCHAR(128) NOT NULL,
    "kind" "promotion_kind" NOT NULL,
    "discount_minor" BIGINT,
    "discount_percent_bps" INTEGER,
    "min_merchandise_minor" BIGINT NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMPTZ(6),
    "valid_to" TIMESTAMPTZ(6),
    "branch_ids_json" JSONB,
    "usage_limit_total" INTEGER,
    "usage_limit_per_customer" INTEGER,
    "combinable" BOOLEAN NOT NULL DEFAULT false,
    "first_order_only" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");
CREATE INDEX "promotions_is_active_idx" ON "promotions"("is_active");

CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "promotion_id" UUID NOT NULL,
    "user_id" UUID,
    "order_id" UUID,
    "redeemed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "coupon_redemptions_promotion_id_idx" ON "coupon_redemptions"("promotion_id");
CREATE INDEX "coupon_redemptions_user_id_idx" ON "coupon_redemptions"("user_id");

ALTER TABLE "coupon_redemptions"
  ADD CONSTRAINT "coupon_redemptions_promotion_id_fkey"
  FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
