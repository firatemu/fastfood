-- Phase 5 — Cart canonical entities.
--
-- Forward-only canonical migration per document 35. Money-bearing
-- columns use BIGINT per document 35 §5. Session-scoped carts use
-- either a userId (customer) or a guestSessionId (guest cookie).

CREATE TABLE carts (
    id                uuid          PRIMARY KEY DEFAULT uuidv7(),
    user_id           uuid          REFERENCES users(id) ON DELETE CASCADE,
    guest_session_id  varchar(64)   UNIQUE,
    status            varchar(16)   NOT NULL DEFAULT 'OPEN',
    branch_id         uuid,
    created_at        timestamptz   NOT NULL DEFAULT now(),
    updated_at        timestamptz   NOT NULL DEFAULT now(),
    expires_at        timestamptz
);

CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_carts_status ON carts(status);

CREATE TABLE cart_line_items (
    id                          uuid          PRIMARY KEY DEFAULT uuidv7(),
    cart_id                      uuid          NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id                   uuid          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_variant_id           uuid          REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity                     integer       NOT NULL,
    unit_price_minor_snapshot     bigint        NOT NULL,
    currency_snapshot            varchar(3)    NOT NULL DEFAULT 'TRY',
    delivery_note                varchar(512),
    display_order                integer       NOT NULL DEFAULT 0,
    created_at                   timestamptz   NOT NULL DEFAULT now(),
    updated_at                   timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_cart_line_items_cart_id ON cart_line_items(cart_id);
CREATE INDEX idx_cart_line_items_product_id ON cart_line_items(product_id);

CREATE TABLE cart_line_modifiers (
    id                              uuid          PRIMARY KEY DEFAULT uuidv7(),
    cart_line_item_id                uuid          NOT NULL REFERENCES cart_line_items(id) ON DELETE CASCADE,
    modifier_id                      uuid          NOT NULL REFERENCES modifiers(id) ON DELETE RESTRICT,
    price_delta_minor_snapshot       bigint        NOT NULL DEFAULT 0,
    created_at                       timestamptz   NOT NULL DEFAULT now(),
    UNIQUE (cart_line_item_id, modifier_id)
);

CREATE INDEX idx_cart_line_modifiers_cart_line_item_id ON cart_line_modifiers(cart_line_item_id);

CREATE TABLE cart_line_removals (
    id                  uuid          PRIMARY KEY DEFAULT uuidv7(),
    cart_line_item_id    uuid          NOT NULL REFERENCES cart_line_items(id) ON DELETE CASCADE,
    ingredient_id        uuid          NOT NULL REFERENCES ingredient_removal_options(id) ON DELETE RESTRICT,
    created_at           timestamptz   NOT NULL DEFAULT now(),
    UNIQUE (cart_line_item_id, ingredient_id)
);

CREATE INDEX idx_cart_line_removals_cart_line_item_id ON cart_line_removals(cart_line_item_id);