-- Golden Home: dedicated hero image + published social-proof aggregates.

ALTER TABLE "product_merchandising"
    ADD COLUMN "hero_image_url" VARCHAR(2048);

CREATE TABLE "storefront_social_proof" (
    "id" UUID NOT NULL,
    "average_rating_bps" INTEGER NOT NULL,
    "happy_customer_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "storefront_social_proof_pkey" PRIMARY KEY ("id")
);
