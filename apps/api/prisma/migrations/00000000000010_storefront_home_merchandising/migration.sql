-- Storefront Golden Home merchandising: nutrition/featured flags, combo offers,
-- published reviews, newsletter, and branch delivery ETA windows.

ALTER TABLE "branches"
    ADD COLUMN "estimated_delivery_minutes_min" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "estimated_delivery_minutes_max" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "product_merchandising" (
    "product_id" UUID NOT NULL,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_hero" BOOLEAN NOT NULL DEFAULT false,
    "kcal" INTEGER,
    "protein_grams" INTEGER,
    "weight_grams" INTEGER,
    "volume_ml" INTEGER,
    "spice_level" INTEGER,
    "badge" VARCHAR(32),
    "accent_label" VARCHAR(64),
    "eyebrow" VARCHAR(128),
    "hero_description" VARCHAR(2048),
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "average_rating_bps" INTEGER,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "hero_spec_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "product_merchandising_pkey" PRIMARY KEY ("product_id")
);

ALTER TABLE "product_merchandising"
    ADD CONSTRAINT "product_merchandising_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "product_merchandising_is_featured_idx" ON "product_merchandising"("is_featured");
CREATE INDEX "product_merchandising_is_hero_idx" ON "product_merchandising"("is_hero");

CREATE TABLE "storefront_combo_offers" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "slug" VARCHAR(128) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" VARCHAR(2048),
    "image_url" VARCHAR(2048),
    "bundle_price_minor" BIGINT NOT NULL,
    "compare_at_minor" BIGINT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "ends_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "storefront_combo_offers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "storefront_combo_offers_slug_key" ON "storefront_combo_offers"("slug");
CREATE INDEX "storefront_combo_offers_is_active_display_order_idx" ON "storefront_combo_offers"("is_active", "display_order");

CREATE TABLE "storefront_combo_offer_items" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "combo_offer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "storefront_combo_offer_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "storefront_combo_offer_items_combo_offer_id_product_id_key"
    ON "storefront_combo_offer_items"("combo_offer_id", "product_id");
CREATE INDEX "storefront_combo_offer_items_product_id_idx" ON "storefront_combo_offer_items"("product_id");

ALTER TABLE "storefront_combo_offer_items"
    ADD CONSTRAINT "storefront_combo_offer_items_combo_offer_id_fkey"
    FOREIGN KEY ("combo_offer_id") REFERENCES "storefront_combo_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "storefront_combo_offer_items"
    ADD CONSTRAINT "storefront_combo_offer_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "storefront_published_reviews" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "author_display_name" VARCHAR(64) NOT NULL,
    "body" VARCHAR(2048) NOT NULL,
    "rating" INTEGER NOT NULL,
    "branch_label" VARCHAR(128),
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "storefront_published_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "storefront_published_reviews_is_published_display_order_idx"
    ON "storefront_published_reviews"("is_published", "display_order");

CREATE TABLE "newsletter_subscriptions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "email" VARCHAR(255) NOT NULL,
    "source" VARCHAR(64) NOT NULL DEFAULT 'ember_club',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "newsletter_subscriptions_email_key" ON "newsletter_subscriptions"("email");
CREATE INDEX "newsletter_subscriptions_source_idx" ON "newsletter_subscriptions"("source");
