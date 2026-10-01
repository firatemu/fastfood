-- Storefront Phase 7: builder flag, public deals listing, branch story,
-- customer content documents. Local development only.

ALTER TABLE "branches"
  ADD COLUMN "story_body" TEXT,
  ADD COLUMN "image_url" VARCHAR(2048),
  ADD COLUMN "pickup_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "delivery_enabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "promotions"
  ADD COLUMN "listed_on_storefront" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "customer_headline" VARCHAR(128),
  ADD COLUMN "customer_description" VARCHAR(512);

ALTER TABLE "product_merchandising"
  ADD COLUMN "is_builder_base" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "product_merchandising_is_builder_base_idx"
  ON "product_merchandising"("is_builder_base");

CREATE TABLE "storefront_content_documents" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "slug" VARCHAR(64) NOT NULL,
  "kind" VARCHAR(32) NOT NULL,
  "title" VARCHAR(128) NOT NULL,
  "body" TEXT NOT NULL,
  "sections_json" JSONB,
  "effective_at" TIMESTAMPTZ(6),
  "is_published" BOOLEAN NOT NULL DEFAULT true,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storefront_content_documents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "storefront_content_documents_slug_key" ON "storefront_content_documents"("slug");
CREATE INDEX "storefront_content_documents_kind_is_published_display_order_idx"
  ON "storefront_content_documents"("kind", "is_published", "display_order");
