-- Phase 6: CheckoutSession, PaymentAttempt, IdempotencyRecord,
-- LoyaltyLedgerEntry, LoyaltyReservation.

CREATE TABLE "checkout_sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID,
    "guest_session_id" VARCHAR(64),
    "cart_id" UUID,
    "branch_id" UUID,
    "status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "merchandise_gross_minor" BIGINT NOT NULL DEFAULT 0,
    "merchandise_net_minor" BIGINT NOT NULL DEFAULT 0,
    "delivery_fee_minor" BIGINT NOT NULL DEFAULT 0,
    "loyalty_redeemed_minor" BIGINT NOT NULL DEFAULT 0,
    "final_payable_minor" BIGINT NOT NULL DEFAULT 0,
    "quote_snapshot_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "checkout_sessions_user_id_idx" ON "checkout_sessions"("user_id");
CREATE INDEX "checkout_sessions_status_idx" ON "checkout_sessions"("status");

CREATE TABLE "payment_attempts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "checkout_session_id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL DEFAULT 'iyzico',
    "provider_payment_id" VARCHAR(128),
    "status" VARCHAR(32) NOT NULL DEFAULT 'INITIATED',
    "amount_minor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "idempotency_key" VARCHAR(128) NOT NULL,
    "failure_code" VARCHAR(64),
    "raw_provider_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_attempts_idempotency_key_key" ON "payment_attempts"("idempotency_key");
CREATE INDEX "payment_attempts_checkout_session_id_idx" ON "payment_attempts"("checkout_session_id");
CREATE INDEX "payment_attempts_status_idx" ON "payment_attempts"("status");

ALTER TABLE "payment_attempts"
  ADD CONSTRAINT "payment_attempts_checkout_session_id_fkey"
  FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "scope" VARCHAR(64) NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "request_hash" VARCHAR(128),
    "response_json" JSONB,
    "status_code" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_records_scope_idempotency_key_key"
  ON "idempotency_records"("scope", "idempotency_key");
CREATE INDEX "idempotency_records_expires_at_idx" ON "idempotency_records"("expires_at");

CREATE TABLE "loyalty_ledger_entries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "entry_type" VARCHAR(32) NOT NULL,
    "points_delta" BIGINT NOT NULL,
    "value_minor_delta" BIGINT NOT NULL DEFAULT 0,
    "order_id" UUID,
    "reservation_id" UUID,
    "reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loyalty_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loyalty_ledger_entries_user_id_created_at_idx"
  ON "loyalty_ledger_entries"("user_id", "created_at");
CREATE INDEX "loyalty_ledger_entries_reservation_id_idx"
  ON "loyalty_ledger_entries"("reservation_id");

CREATE TABLE "loyalty_reservations" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "checkout_session_id" UUID,
    "points_reserved" BIGINT NOT NULL,
    "value_minor" BIGINT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    CONSTRAINT "loyalty_reservations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loyalty_reservations_user_id_status_idx"
  ON "loyalty_reservations"("user_id", "status");
CREATE INDEX "loyalty_reservations_checkout_session_id_idx"
  ON "loyalty_reservations"("checkout_session_id");
