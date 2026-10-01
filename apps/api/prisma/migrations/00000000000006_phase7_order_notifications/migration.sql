-- Phase 7: Order aggregate + Notification foundation.

CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID,
    "branch_id" UUID,
    "checkout_session_id" UUID,
    "status" VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "merchandise_net_minor" BIGINT NOT NULL DEFAULT 0,
    "delivery_fee_minor" BIGINT NOT NULL DEFAULT 0,
    "loyalty_redeemed_minor" BIGINT NOT NULL DEFAULT 0,
    "final_payable_minor" BIGINT NOT NULL DEFAULT 0,
    "delivery_address_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");
CREATE INDEX "orders_branch_id_status_idx" ON "orders"("branch_id", "status");
CREATE INDEX "orders_status_idx" ON "orders"("status");

CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_variant_id" UUID,
    "product_name_snapshot" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_minor_snapshot" BIGINT NOT NULL,
    "line_gross_minor_snapshot" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "order_item_modifiers" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "order_item_id" UUID NOT NULL,
    "modifier_id" UUID NOT NULL,
    "name_snapshot" VARCHAR(128) NOT NULL,
    "price_delta_minor_snapshot" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "order_item_modifiers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "order_item_modifiers_order_item_id_idx" ON "order_item_modifiers"("order_item_id");
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "order_item_removals" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "order_item_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "name_snapshot" VARCHAR(128) NOT NULL,
    CONSTRAINT "order_item_removals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "order_item_removals_order_item_id_idx" ON "order_item_removals"("order_item_id");
ALTER TABLE "order_item_removals" ADD CONSTRAINT "order_item_removals_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "order_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "order_id" UUID NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "from_status" VARCHAR(32),
    "to_status" VARCHAR(32),
    "actor_user_id" UUID,
    "payload_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "order_events_order_id_created_at_idx" ON "order_events"("order_id", "created_at");
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "order_branch_assignments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "order_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "reason" VARCHAR(255),
    "assigned_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_branch_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "order_branch_assignments_order_id_idx" ON "order_branch_assignments"("order_id");
CREATE INDEX "order_branch_assignments_branch_id_idx" ON "order_branch_assignments"("branch_id");
ALTER TABLE "order_branch_assignments" ADD CONSTRAINT "order_branch_assignments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID,
    "channel" VARCHAR(32) NOT NULL,
    "template_key" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "payload_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");
