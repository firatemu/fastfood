-- Phase 4 — Catalog + Branch canonical entities.
--
-- Forward-only canonical migration per document 35 (no `db push`,
-- no ad-hoc drift). All entities use UUIDv7 primary IDs and the
-- canonical snake_case naming from document 16 + 35. Money-bearing
-- columns use BIGINT per document 35 §5.

-- ─── Catalog ───

CREATE TABLE categories (
    id                  uuid          PRIMARY KEY DEFAULT uuidv7(),
    parent_category_id  uuid          REFERENCES categories(id) ON DELETE SET NULL,
    slug                varchar(128)  NOT NULL UNIQUE,
    name                varchar(128)  NOT NULL,
    description         varchar(1024),
    display_order       integer       NOT NULL DEFAULT 0,
    is_active           boolean       NOT NULL DEFAULT true,
    created_at          timestamptz   NOT NULL DEFAULT now(),
    updated_at          timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent_category_id ON categories(parent_category_id);
CREATE INDEX idx_categories_slug ON categories(slug);

CREATE TABLE allergens (
    id           uuid          PRIMARY KEY DEFAULT uuidv7(),
    code         varchar(64)   NOT NULL UNIQUE,
    name         varchar(128)  NOT NULL,
    description  varchar(512),
    created_at   timestamptz   NOT NULL DEFAULT now(),
    updated_at   timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id                uuid          PRIMARY KEY DEFAULT uuidv7(),
    category_id       uuid          NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    slug              varchar(128)  NOT NULL UNIQUE,
    name              varchar(128)  NOT NULL,
    description       varchar(2048),
    base_price_minor  bigint        NOT NULL,
    currency          varchar(3)    NOT NULL DEFAULT 'TRY',
    display_order     integer       NOT NULL DEFAULT 0,
    is_active         boolean       NOT NULL DEFAULT true,
    created_at        timestamptz   NOT NULL DEFAULT now(),
    updated_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);

CREATE TABLE product_media (
    id            uuid          PRIMARY KEY DEFAULT uuidv7(),
    product_id    uuid          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url           varchar(2048) NOT NULL,
    alt_text      varchar(255),
    display_order integer       NOT NULL DEFAULT 0,
    created_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_media_product_id ON product_media(product_id);

CREATE TABLE product_variants (
    id            uuid          PRIMARY KEY DEFAULT uuidv7(),
    product_id    uuid          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku           varchar(64)   NOT NULL UNIQUE,
    name          varchar(128)  NOT NULL,
    price_minor   bigint        NOT NULL,
    display_order integer       NOT NULL DEFAULT 0,
    is_active     boolean       NOT NULL DEFAULT true,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    updated_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

CREATE TABLE modifier_groups (
    id            uuid          PRIMARY KEY DEFAULT uuidv7(),
    name          varchar(128)  NOT NULL,
    selection_min integer       NOT NULL DEFAULT 0,
    selection_max integer       NOT NULL DEFAULT 1,
    is_active     boolean       NOT NULL DEFAULT true,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    updated_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE modifiers (
    id                uuid          PRIMARY KEY DEFAULT uuidv7(),
    modifier_group_id uuid          NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name              varchar(128)  NOT NULL,
    price_delta_minor bigint        NOT NULL DEFAULT 0,
    is_active         boolean       NOT NULL DEFAULT true,
    created_at        timestamptz   NOT NULL DEFAULT now(),
    updated_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_modifiers_modifier_group_id ON modifiers(modifier_group_id);

CREATE TABLE product_modifier_groups (
    product_id        uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    modifier_group_id uuid        NOT NULL REFERENCES modifier_groups(id) ON DELETE RESTRICT,
    display_order     integer     NOT NULL DEFAULT 0,
    created_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (product_id, modifier_group_id)
);

CREATE INDEX idx_product_modifier_groups_modifier_group_id ON product_modifier_groups(modifier_group_id);

CREATE TABLE ingredient_removal_options (
    id          uuid          PRIMARY KEY DEFAULT uuidv7(),
    product_id  uuid          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name        varchar(128)  NOT NULL,
    is_active   boolean       NOT NULL DEFAULT true,
    created_at  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingredient_removal_options_product_id ON ingredient_removal_options(product_id);

CREATE TABLE product_allergens (
    product_id  uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    allergen_id  uuid        NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (product_id, allergen_id)
);

CREATE INDEX idx_product_allergens_allergen_id ON product_allergens(allergen_id);

-- ─── Branch ───

CREATE TABLE branches (
    id                 uuid          PRIMARY KEY DEFAULT uuidv7(),
    code               varchar(32)   NOT NULL UNIQUE,
    name               varchar(128)  NOT NULL,
    address_line       varchar(255)  NOT NULL,
    latitude           decimal(9, 6) NOT NULL,
    longitude          decimal(9, 6) NOT NULL,
    phone              varchar(32),
    is_active          boolean       NOT NULL DEFAULT true,
    is_accepting_orders boolean      NOT NULL DEFAULT true,
    min_order_minor    bigint        NOT NULL DEFAULT 0,
    delivery_fee_minor bigint        NOT NULL DEFAULT 0,
    created_at         timestamptz   NOT NULL DEFAULT now(),
    updated_at         timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_branches_code ON branches(code);

CREATE TABLE branch_operating_hours (
    id           uuid          PRIMARY KEY DEFAULT uuidv7(),
    branch_id    uuid          NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    day_of_week  integer       NOT NULL,
    opens_at     timestamptz   NOT NULL,
    closes_at    timestamptz   NOT NULL,
    is_closed    boolean       NOT NULL DEFAULT false,
    special_note varchar(255),
    created_at   timestamptz   NOT NULL DEFAULT now(),
    updated_at   timestamptz   NOT NULL DEFAULT now(),
    UNIQUE (branch_id, day_of_week)
);

CREATE INDEX idx_branch_operating_hours_branch_id ON branch_operating_hours(branch_id);

CREATE TABLE service_areas (
    id              uuid          PRIMARY KEY DEFAULT uuidv7(),
    branch_id        uuid          NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name             varchar(128)  NOT NULL,
    -- GeoJSON MultiPolygon in EPSG:4326. Phase 4 routing engine
    -- uses an in-memory point-in-polygon check against this shape.
    -- Production deployment with PostGIS spatial index uses the
    -- geometry column directly.
    polygon_geojson  jsonb         NOT NULL,
    priority         integer       NOT NULL DEFAULT 0,
    is_active        boolean       NOT NULL DEFAULT true,
    created_at       timestamptz   NOT NULL DEFAULT now(),
    updated_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_areas_branch_id ON service_areas(branch_id);

CREATE TABLE branch_product_availability (
    id          uuid          PRIMARY KEY DEFAULT uuidv7(),
    branch_id    uuid          NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id   uuid          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    is_available boolean       NOT NULL DEFAULT true,
    reason       varchar(255),
    created_at   timestamptz   NOT NULL DEFAULT now(),
    updated_at   timestamptz   NOT NULL DEFAULT now(),
    UNIQUE (branch_id, product_id)
);

CREATE INDEX idx_branch_product_availability_product_id ON branch_product_availability(product_id);