-- CreateTable
CREATE TABLE "customer_push_tokens" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID,
    "token" VARCHAR(255) NOT NULL,
    "platform" VARCHAR(32) NOT NULL DEFAULT 'android',
    "device_model" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_push_tokens_token_key" ON "customer_push_tokens"("token");

-- CreateIndex
CREATE INDEX "customer_push_tokens_user_id_idx" ON "customer_push_tokens"("user_id");
