ALTER TABLE "product_merchandising"
ADD COLUMN "hero_display_order" INTEGER NOT NULL DEFAULT 0;

DROP INDEX "product_merchandising_is_hero_idx";

CREATE INDEX "product_merchandising_is_hero_hero_display_order_idx"
ON "product_merchandising"("is_hero", "hero_display_order");
