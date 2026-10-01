-- Storefront Phase 6: Club tiers, welcome reward, spin wheel, table QR,
-- notification read state, support conversations. Local development only.

ALTER TABLE "notifications" ADD COLUMN "read_at" TIMESTAMPTZ(6);
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

CREATE TABLE "loyalty_tiers" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "code" VARCHAR(32) NOT NULL,
  "display_name" VARCHAR(64) NOT NULL,
  "min_lifetime_earned_points" BIGINT NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loyalty_tiers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "loyalty_tiers_code_key" ON "loyalty_tiers"("code");
CREATE INDEX "loyalty_tiers_is_active_sort_order_idx" ON "loyalty_tiers"("is_active", "sort_order");

CREATE TABLE "welcome_reward_grants" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "user_id" UUID NOT NULL,
  "promotion_id" UUID NOT NULL,
  "points_granted" BIGINT NOT NULL DEFAULT 0,
  "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6),
  CONSTRAINT "welcome_reward_grants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "welcome_reward_grants_user_id_key" ON "welcome_reward_grants"("user_id");
CREATE INDEX "welcome_reward_grants_promotion_id_idx" ON "welcome_reward_grants"("promotion_id");

CREATE TABLE "spin_campaigns" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "code" VARCHAR(64) NOT NULL,
  "name" VARCHAR(128) NOT NULL,
  "starts_at" TIMESTAMPTZ(6) NOT NULL,
  "ends_at" TIMESTAMPTZ(6) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "daily_spin_limit" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "spin_campaigns_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "spin_campaigns_code_key" ON "spin_campaigns"("code");
CREATE INDEX "spin_campaigns_is_active_starts_at_ends_at_idx" ON "spin_campaigns"("is_active", "starts_at", "ends_at");

CREATE TABLE "spin_prizes" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "campaign_id" UUID NOT NULL,
  "code" VARCHAR(32) NOT NULL,
  "label" VARCHAR(128) NOT NULL,
  "kind" VARCHAR(32) NOT NULL,
  "weight" INTEGER NOT NULL,
  "points_delta" BIGINT,
  "discount_minor" BIGINT,
  "discount_percent_bps" INTEGER,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "spin_prizes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "spin_prizes_campaign_id_code_key" ON "spin_prizes"("campaign_id", "code");
CREATE INDEX "spin_prizes_campaign_id_is_active_idx" ON "spin_prizes"("campaign_id", "is_active");

CREATE TABLE "spin_plays" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "campaign_id" UUID NOT NULL,
  "prize_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "period_key" VARCHAR(16) NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "coupon_code" VARCHAR(64),
  "promotion_id" UUID,
  "points_awarded" BIGINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "spin_plays_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "spin_plays_user_id_campaign_id_period_key_key" ON "spin_plays"("user_id", "campaign_id", "period_key");
CREATE UNIQUE INDEX "spin_plays_user_id_idempotency_key_key" ON "spin_plays"("user_id", "idempotency_key");
CREATE INDEX "spin_plays_campaign_id_created_at_idx" ON "spin_plays"("campaign_id", "created_at");

CREATE TABLE "dining_tables" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "branch_id" UUID NOT NULL,
  "label" VARCHAR(64) NOT NULL,
  "public_code" VARCHAR(64) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dining_tables_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dining_tables_public_code_key" ON "dining_tables"("public_code");
CREATE INDEX "dining_tables_branch_id_is_active_idx" ON "dining_tables"("branch_id", "is_active");

CREATE TABLE "dining_table_scans" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "table_id" UUID NOT NULL,
  "user_id" UUID,
  "guest_session_id" VARCHAR(64),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dining_table_scans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dining_table_scans_table_id_created_at_idx" ON "dining_table_scans"("table_id", "created_at");

CREATE TABLE "support_conversations" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "user_id" UUID NOT NULL,
  "order_id" UUID,
  "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMPTZ(6),
  CONSTRAINT "support_conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "support_conversations_user_id_status_idx" ON "support_conversations"("user_id", "status");
CREATE INDEX "support_conversations_order_id_idx" ON "support_conversations"("order_id");

CREATE TABLE "support_messages" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "conversation_id" UUID NOT NULL,
  "sender_type" VARCHAR(16) NOT NULL,
  "body" VARCHAR(2000) NOT NULL,
  "client_request_id" VARCHAR(128),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "support_messages_conversation_id_client_request_id_key"
  ON "support_messages"("conversation_id", "client_request_id");
CREATE INDEX "support_messages_conversation_id_created_at_idx"
  ON "support_messages"("conversation_id", "created_at");

ALTER TABLE "welcome_reward_grants"
  ADD CONSTRAINT "welcome_reward_grants_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "welcome_reward_grants"
  ADD CONSTRAINT "welcome_reward_grants_promotion_id_fkey"
  FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "spin_prizes"
  ADD CONSTRAINT "spin_prizes_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "spin_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "spin_plays"
  ADD CONSTRAINT "spin_plays_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "spin_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "spin_plays"
  ADD CONSTRAINT "spin_plays_prize_id_fkey"
  FOREIGN KEY ("prize_id") REFERENCES "spin_prizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "spin_plays"
  ADD CONSTRAINT "spin_plays_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dining_tables"
  ADD CONSTRAINT "dining_tables_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dining_table_scans"
  ADD CONSTRAINT "dining_table_scans_table_id_fkey"
  FOREIGN KEY ("table_id") REFERENCES "dining_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dining_table_scans"
  ADD CONSTRAINT "dining_table_scans_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_conversations"
  ADD CONSTRAINT "support_conversations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_messages"
  ADD CONSTRAINT "support_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "support_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
