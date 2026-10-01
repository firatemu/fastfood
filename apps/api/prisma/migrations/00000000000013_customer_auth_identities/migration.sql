-- Storefront Phase 4: customer password credentials, multi-provider
-- identities, email verification, password reset, account preferences.
-- Local development only. No production migrations.

CREATE TYPE "auth_provider" AS ENUM ('PHONE_OTP', 'EMAIL_PASSWORD', 'GOOGLE', 'APPLE');

ALTER TABLE "customer_profiles"
  ADD COLUMN "email_normalized" VARCHAR(255),
  ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "email_verified_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "customer_profiles_email_normalized_key"
  ON "customer_profiles"("email_normalized");

CREATE TABLE "customer_credentials" (
  "user_id" UUID NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "password_algo" VARCHAR(32) NOT NULL,
  "password_updated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "customer_credentials_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "customer_credentials"
  ADD CONSTRAINT "customer_credentials_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "auth_identities" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "user_id" UUID NOT NULL,
  "provider" "auth_provider" NOT NULL,
  "provider_subject" VARCHAR(255) NOT NULL,
  "email_normalized" VARCHAR(255),
  "email_verified_by_provider" BOOLEAN NOT NULL DEFAULT false,
  "linked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_identities_provider_provider_subject_key"
  ON "auth_identities"("provider", "provider_subject");
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities"("user_id");

ALTER TABLE "auth_identities"
  ADD CONSTRAINT "auth_identities_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "email_verification_challenges" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "user_id" UUID NOT NULL,
  "email_normalized" VARCHAR(255) NOT NULL,
  "token_hash" VARCHAR(128) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_challenges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_verification_challenges_token_hash_key"
  ON "email_verification_challenges"("token_hash");
CREATE INDEX "email_verification_challenges_user_id_idx"
  ON "email_verification_challenges"("user_id");

ALTER TABLE "email_verification_challenges"
  ADD CONSTRAINT "email_verification_challenges_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "password_reset_challenges" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "user_id" UUID NOT NULL,
  "token_hash" VARCHAR(128) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_challenges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_challenges_token_hash_key"
  ON "password_reset_challenges"("token_hash");
CREATE INDEX "password_reset_challenges_user_id_idx"
  ON "password_reset_challenges"("user_id");

ALTER TABLE "password_reset_challenges"
  ADD CONSTRAINT "password_reset_challenges_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "customer_preferences" (
  "user_id" UUID NOT NULL,
  "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
  "newsletter_opt_in" BOOLEAN NOT NULL DEFAULT false,
  "order_updates_opt_in" BOOLEAN NOT NULL DEFAULT true,
  "kvkk_accepted_at" TIMESTAMPTZ(6),
  "locale" VARCHAR(16),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "customer_preferences_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "customer_preferences"
  ADD CONSTRAINT "customer_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "newsletter_subscriptions"
  ADD COLUMN "user_id" UUID,
  ADD COLUMN "unsubscribed_at" TIMESTAMPTZ(6);
