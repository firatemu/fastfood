-- Referential integrity for the money-bearing tables (audit P0-4 / P1-3).
--
-- `orders`, `checkout_sessions`, `loyalty_ledger_entries`,
-- `loyalty_reservations` and `refunds` carried plain UUID columns with no
-- foreign key at all. Referential integrity was therefore enforced only by
-- application code: a row could point at a branch or a user that does not
-- exist, and branch-scoped revenue reporting silently counted the wrong
-- rows.
--
-- The same migration re-adds the eight foreign keys that the
-- `20260922143150_order_pickup_tokens` migration dropped without restoring
-- them (audit P1-3):
--
--   audit_logs.actor_user_id
--   business_settings.updated_by_user_id
--   cart_line_items.product_id
--   cart_line_items.product_variant_id
--   cart_line_modifiers.modifier_id
--   cart_line_removals.ingredient_id
--   carts.user_id
--   user_roles.granted_by_user_id
--
-- Delete semantics follow the canonical data model (documents 16 + 35):
--   - user-scoped rows  → ON DELETE CASCADE (the user owns them)
--   - financial history  → ON DELETE SET NULL (the row must survive)
--   - operational refs   → ON DELETE RESTRICT (cannot drop a parent that is
--                                          still referenced by live data)

-- ─── orders ────────────────────────────────────────────────────────────────
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches" ("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_checkout_session_id_fkey"
  FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions" ("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

-- ─── checkout_sessions ────────────────────────────────────────────────────
ALTER TABLE "checkout_sessions"
  ADD CONSTRAINT "checkout_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "checkout_sessions"
  ADD CONSTRAINT "checkout_sessions_cart_id_fkey"
  FOREIGN KEY ("cart_id") REFERENCES "carts" ("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "checkout_sessions"
  ADD CONSTRAINT "checkout_sessions_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches" ("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "checkout_sessions"
  ADD CONSTRAINT "checkout_sessions_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders" ("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

-- `orders.checkout_session_id` references `checkout_sessions(id)` and
-- `checkout_sessions.order_id` references `orders(id)`. The two tables
-- reference each other, so the constraint pair has to be created in one
-- transaction with the checks deferred — otherwise the first constraint
-- cannot be validated against rows that the second one has not created
-- yet.
SET CONSTRAINTS ALL DEFERRED;

-- ─── loyalty_ledger_entries ───────────────────────────────────────────────
ALTER TABLE "loyalty_ledger_entries"
  ADD CONSTRAINT "loyalty_ledger_entries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "loyalty_ledger_entries"
  ADD CONSTRAINT "loyalty_ledger_entries_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders" ("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "loyalty_ledger_entries"
  ADD CONSTRAINT "loyalty_ledger_entries_reservation_id_fkey"
  FOREIGN KEY ("reservation_id") REFERENCES "loyalty_reservations" ("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

-- ─── loyalty_reservations ─────────────────────────────────────────────────
ALTER TABLE "loyalty_reservations"
  ADD CONSTRAINT "loyalty_reservations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "loyalty_reservations"
  ADD CONSTRAINT "loyalty_reservations_checkout_session_id_fkey"
  FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions" ("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

-- ─── refunds ──────────────────────────────────────────────────────────────
-- The refund row is the financial record of a refund; it must always point
-- at the order it belongs to. `order_id` becomes NOT NULL in the follow-up
-- migration once the refund service writes it (audit P0-1).
ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders" ("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- ─── restored foreign keys (audit P1-3) ───────────────────────────────────
-- The menu seeder rebuilds a modifier group's options wholesale
-- (`modifier.deleteMany` + `createMany` with fresh UUIDs). Cart lines that
-- referenced the old option rows were left dangling — the FK had been
-- dropped, so nothing complained. Those rows describe a cart
-- configuration that can no longer be priced and can never be ordered, so
-- they are removed before the constraint is restored.
DELETE FROM "cart_line_modifiers" m
 WHERE NOT EXISTS (SELECT 1 FROM "modifiers" mo WHERE mo.id = m."modifier_id");

DELETE FROM "cart_line_removals" r
 WHERE NOT EXISTS (SELECT 1 FROM "ingredient_removal_options" o WHERE o.id = r."ingredient_id");

DELETE FROM "cart_line_items" li
 WHERE NOT EXISTS (SELECT 1 FROM "products" p WHERE p.id = li."product_id")
    OR (li."product_variant_id" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "product_variants" v WHERE v.id = li."product_variant_id"));

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "business_settings"
  ADD CONSTRAINT "business_settings_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "users" ("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "cart_line_items"
  ADD CONSTRAINT "cart_line_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products" ("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "cart_line_items"
  ADD CONSTRAINT "cart_line_items_product_variant_id_fkey"
  FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "cart_line_modifiers"
  ADD CONSTRAINT "cart_line_modifiers_modifier_id_fkey"
  FOREIGN KEY ("modifier_id") REFERENCES "modifiers" ("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "cart_line_removals"
  ADD CONSTRAINT "cart_line_removals_ingredient_id_fkey"
  FOREIGN KEY ("ingredient_id") REFERENCES "ingredient_removal_options" ("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "carts"
  ADD CONSTRAINT "carts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "user_roles"
  ADD CONSTRAINT "user_roles_granted_by_user_id_fkey"
  FOREIGN KEY ("granted_by_user_id") REFERENCES "users" ("id")
  ON UPDATE CASCADE ON DELETE SET NULL;
