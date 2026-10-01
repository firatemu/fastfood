-- DropForeignKey
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_user_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_user_id_fkey";

-- DropForeignKey
ALTER TABLE "branch_operating_hours" DROP CONSTRAINT "branch_operating_hours_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "branch_product_availability" DROP CONSTRAINT "branch_product_availability_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "branch_product_availability" DROP CONSTRAINT "branch_product_availability_product_id_fkey";

-- DropForeignKey
ALTER TABLE "business_settings" DROP CONSTRAINT "business_settings_updated_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_line_items" DROP CONSTRAINT "cart_line_items_cart_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_line_items" DROP CONSTRAINT "cart_line_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_line_items" DROP CONSTRAINT "cart_line_items_product_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_line_modifiers" DROP CONSTRAINT "cart_line_modifiers_cart_line_item_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_line_modifiers" DROP CONSTRAINT "cart_line_modifiers_modifier_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_line_removals" DROP CONSTRAINT "cart_line_removals_cart_line_item_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_line_removals" DROP CONSTRAINT "cart_line_removals_ingredient_id_fkey";

-- DropForeignKey
ALTER TABLE "carts" DROP CONSTRAINT "carts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_category_id_fkey";

-- DropForeignKey
ALTER TABLE "customer_profiles" DROP CONSTRAINT "customer_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ingredient_removal_options" DROP CONSTRAINT "ingredient_removal_options_product_id_fkey";

-- DropForeignKey
ALTER TABLE "modifiers" DROP CONSTRAINT "modifiers_modifier_group_id_fkey";

-- DropForeignKey
ALTER TABLE "outbox_events" DROP CONSTRAINT "outbox_events_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "product_allergens" DROP CONSTRAINT "product_allergens_allergen_id_fkey";

-- DropForeignKey
ALTER TABLE "product_allergens" DROP CONSTRAINT "product_allergens_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_media" DROP CONSTRAINT "product_media_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_modifier_groups" DROP CONSTRAINT "product_modifier_groups_modifier_group_id_fkey";

-- DropForeignKey
ALTER TABLE "product_modifier_groups" DROP CONSTRAINT "product_modifier_groups_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_product_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_role_id_fkey";

-- DropForeignKey
ALTER TABLE "service_areas" DROP CONSTRAINT "service_areas_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "staff_profiles" DROP CONSTRAINT "staff_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_branch_scopes" DROP CONSTRAINT "user_branch_scopes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_granted_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_role_id_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_fkey";

-- AlterTable
ALTER TABLE "addresses" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "allergens" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "branch_operating_hours" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "branch_product_availability" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "branches" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "business_settings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cart_line_items" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "carts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "courier_profiles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "customer_profiles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "deliveries" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "dining_tables" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "foundation_probes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "loyalty_tiers" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "modifier_groups" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "modifiers" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "display_number" SET DEFAULT 'SP00001';

-- AlterTable
ALTER TABLE "permissions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "product_variants" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "refunds" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "service_areas" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "spin_campaigns" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "staff_profiles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "storefront_content_documents" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "support_conversations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_branch_scopes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "order_pickup_tokens" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "order_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "token_prefix" VARCHAR(12) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "consumed_by_courier_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_pickup_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_pickup_tokens_token_hash_key" ON "order_pickup_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "order_pickup_tokens_token_prefix_key" ON "order_pickup_tokens"("token_prefix");

-- CreateIndex
CREATE INDEX "order_pickup_tokens_order_id_idx" ON "order_pickup_tokens"("order_id");

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_scopes" ADD CONSTRAINT "user_branch_scopes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifiers" ADD CONSTRAINT "modifiers_modifier_group_id_fkey" FOREIGN KEY ("modifier_group_id") REFERENCES "modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_modifier_group_id_fkey" FOREIGN KEY ("modifier_group_id") REFERENCES "modifier_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_removal_options" ADD CONSTRAINT "ingredient_removal_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_allergens" ADD CONSTRAINT "product_allergens_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_allergens" ADD CONSTRAINT "product_allergens_allergen_id_fkey" FOREIGN KEY ("allergen_id") REFERENCES "allergens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_operating_hours" ADD CONSTRAINT "branch_operating_hours_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_product_availability" ADD CONSTRAINT "branch_product_availability_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_product_availability" ADD CONSTRAINT "branch_product_availability_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_line_items" ADD CONSTRAINT "cart_line_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_line_modifiers" ADD CONSTRAINT "cart_line_modifiers_cart_line_item_id_fkey" FOREIGN KEY ("cart_line_item_id") REFERENCES "cart_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_line_removals" ADD CONSTRAINT "cart_line_removals_cart_line_item_id_fkey" FOREIGN KEY ("cart_line_item_id") REFERENCES "cart_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_pickup_tokens" ADD CONSTRAINT "order_pickup_tokens_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_addresses_user_id" RENAME TO "addresses_user_id_idx";

-- RenameIndex
ALTER INDEX "idx_audit_logs_action" RENAME TO "audit_logs_action_idx";

-- RenameIndex
ALTER INDEX "idx_audit_logs_actor_user_id" RENAME TO "audit_logs_actor_user_id_idx";

-- RenameIndex
ALTER INDEX "idx_audit_logs_created_at" RENAME TO "audit_logs_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_audit_logs_resource" RENAME TO "audit_logs_resource_type_resource_id_idx";

-- RenameIndex
ALTER INDEX "idx_branch_operating_hours_branch_id" RENAME TO "branch_operating_hours_branch_id_idx";

-- RenameIndex
ALTER INDEX "idx_branch_product_availability_product_id" RENAME TO "branch_product_availability_product_id_idx";

-- RenameIndex
ALTER INDEX "idx_branches_code" RENAME TO "branches_code_idx";

-- RenameIndex
ALTER INDEX "idx_business_settings_category" RENAME TO "business_settings_category_idx";

-- RenameIndex
ALTER INDEX "idx_cart_line_items_cart_id" RENAME TO "cart_line_items_cart_id_idx";

-- RenameIndex
ALTER INDEX "idx_cart_line_items_product_id" RENAME TO "cart_line_items_product_id_idx";

-- RenameIndex
ALTER INDEX "idx_cart_line_modifiers_cart_line_item_id" RENAME TO "cart_line_modifiers_cart_line_item_id_idx";

-- RenameIndex
ALTER INDEX "idx_cart_line_removals_cart_line_item_id" RENAME TO "cart_line_removals_cart_line_item_id_idx";

-- RenameIndex
ALTER INDEX "idx_carts_status" RENAME TO "carts_status_idx";

-- RenameIndex
ALTER INDEX "idx_carts_user_id" RENAME TO "carts_user_id_idx";

-- RenameIndex
ALTER INDEX "idx_categories_parent_category_id" RENAME TO "categories_parent_category_id_idx";

-- RenameIndex
ALTER INDEX "idx_categories_slug" RENAME TO "categories_slug_idx";

-- RenameIndex
ALTER INDEX "idx_ingredient_removal_options_product_id" RENAME TO "ingredient_removal_options_product_id_idx";

-- RenameIndex
ALTER INDEX "idx_modifiers_modifier_group_id" RENAME TO "modifiers_modifier_group_id_idx";

-- RenameIndex
ALTER INDEX "idx_outbox_events_aggregate" RENAME TO "outbox_events_aggregate_type_aggregate_id_idx";

-- RenameIndex
ALTER INDEX "idx_outbox_events_event_type" RENAME TO "outbox_events_event_type_idx";

-- RenameIndex
ALTER INDEX "idx_outbox_events_published_at" RENAME TO "outbox_events_published_at_idx";

-- RenameIndex
ALTER INDEX "idx_product_allergens_allergen_id" RENAME TO "product_allergens_allergen_id_idx";

-- RenameIndex
ALTER INDEX "idx_product_media_product_id" RENAME TO "product_media_product_id_idx";

-- RenameIndex
ALTER INDEX "idx_product_modifier_groups_modifier_group_id" RENAME TO "product_modifier_groups_modifier_group_id_idx";

-- RenameIndex
ALTER INDEX "idx_product_variants_product_id" RENAME TO "product_variants_product_id_idx";

-- RenameIndex
ALTER INDEX "idx_products_category_id" RENAME TO "products_category_id_idx";

-- RenameIndex
ALTER INDEX "idx_products_slug" RENAME TO "products_slug_idx";

-- RenameIndex
ALTER INDEX "idx_role_permissions_permission_id" RENAME TO "role_permissions_permission_id_idx";

-- RenameIndex
ALTER INDEX "idx_service_areas_branch_id" RENAME TO "service_areas_branch_id_idx";

-- RenameIndex
ALTER INDEX "idx_sessions_expires_at" RENAME TO "sessions_expires_at_idx";

-- RenameIndex
ALTER INDEX "idx_sessions_family_id" RENAME TO "sessions_family_id_idx";

-- RenameIndex
ALTER INDEX "idx_sessions_user_id" RENAME TO "sessions_user_id_idx";

-- RenameIndex
ALTER INDEX "storefront_content_documents_kind_is_published_display_order_id" RENAME TO "storefront_content_documents_kind_is_published_display_orde_idx";

-- RenameIndex
ALTER INDEX "idx_user_branch_scopes_branch_id" RENAME TO "user_branch_scopes_branch_id_idx";

-- RenameIndex
ALTER INDEX "idx_user_roles_role_id" RENAME TO "user_roles_role_id_idx";

-- RenameIndex
ALTER INDEX "idx_users_actor_type" RENAME TO "users_actor_type_idx";

-- RenameIndex
ALTER INDEX "idx_users_status" RENAME TO "users_status_idx";
