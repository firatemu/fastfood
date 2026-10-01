-- Phase 3 storefront checkout: fulfillment, schedule, tip, preferences, building access.

ALTER TABLE "addresses" ADD COLUMN "access_code" VARCHAR(64);

ALTER TABLE "checkout_sessions"
  ADD COLUMN "fulfillment_mode" VARCHAR(16) NOT NULL DEFAULT 'DELIVERY',
  ADD COLUMN "scheduled_for" TIMESTAMPTZ(6),
  ADD COLUMN "tip_minor" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "pickup_discount_minor" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "eco_packaging" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "contactless" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "building_access_code" VARCHAR(64),
  ADD COLUMN "delivery_note" VARCHAR(512),
  ADD COLUMN "payment_method_code" VARCHAR(32),
  ADD COLUMN "guest_name" VARCHAR(120),
  ADD COLUMN "guest_phone" VARCHAR(32),
  ADD COLUMN "order_id" UUID;

CREATE UNIQUE INDEX "checkout_sessions_order_id_key" ON "checkout_sessions"("order_id");

ALTER TABLE "orders"
  ADD COLUMN "fulfillment_mode" VARCHAR(16) NOT NULL DEFAULT 'DELIVERY',
  ADD COLUMN "scheduled_for" TIMESTAMPTZ(6),
  ADD COLUMN "tip_minor" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "pickup_discount_minor" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "eco_packaging" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "contactless" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "building_access_code" VARCHAR(64),
  ADD COLUMN "delivery_note" VARCHAR(512);

CREATE UNIQUE INDEX "orders_checkout_session_id_key" ON "orders"("checkout_session_id");
