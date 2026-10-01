-- Phase 8 courier / delivery schema (document 15 + 31).

CREATE TABLE "courier_profiles" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(128) NOT NULL,
    "phone" VARCHAR(32),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_active_deliveries" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "courier_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "courier_profiles_user_id_key" ON "courier_profiles"("user_id");

CREATE TABLE "deliveries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "order_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "courier_id" UUID,
    "status" VARCHAR(32) NOT NULL DEFAULT 'UNASSIGNED',
    "recipient_name" VARCHAR(128),
    "recipient_phone" VARCHAR(32),
    "address_line" VARCHAR(255),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "delivery_note" VARCHAR(512),
    "picked_up_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deliveries_order_id_key" ON "deliveries"("order_id");
CREATE INDEX "deliveries_branch_id_status_idx" ON "deliveries"("branch_id", "status");
CREATE INDEX "deliveries_courier_id_status_idx" ON "deliveries"("courier_id", "status");

CREATE TABLE "delivery_assignments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "delivery_id" UUID NOT NULL,
    "courier_id" UUID NOT NULL,
    "assigned_by" UUID,
    "reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_assignments_delivery_id_idx" ON "delivery_assignments"("delivery_id");
CREATE INDEX "delivery_assignments_courier_id_idx" ON "delivery_assignments"("courier_id");

CREATE TABLE "qr_claim_tokens" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "delivery_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "claimed_at" TIMESTAMPTZ(6),
    "claimed_by_courier_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "qr_claim_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "qr_claim_tokens_token_hash_key" ON "qr_claim_tokens"("token_hash");
CREATE INDEX "qr_claim_tokens_delivery_id_idx" ON "qr_claim_tokens"("delivery_id");

CREATE TABLE "courier_location_points" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "courier_id" UUID NOT NULL,
    "delivery_id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy_m" DOUBLE PRECISION,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "courier_location_points_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "courier_location_points_courier_id_recorded_at_idx" ON "courier_location_points"("courier_id", "recorded_at");
CREATE INDEX "courier_location_points_delivery_id_recorded_at_idx" ON "courier_location_points"("delivery_id", "recorded_at");

ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "courier_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "courier_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qr_claim_tokens" ADD CONSTRAINT "qr_claim_tokens_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "courier_location_points" ADD CONSTRAINT "courier_location_points_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "courier_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_location_points" ADD CONSTRAINT "courier_location_points_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
