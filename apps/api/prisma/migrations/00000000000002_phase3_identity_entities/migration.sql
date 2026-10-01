-- Phase 3 — Canonical identity entity set.
--
-- Forward-only canonical migration per document 35 (no `db push`, no
-- ad-hoc drift). All entities use UUIDv7 primary IDs and the
-- canonical snake_case naming from document 16 + 35. Money-bearing
-- fields will be added in later phases (catalog / order / loyalty).
--
-- The transaction guard at the application layer enforces the
-- append-only invariant on audit_logs and the transactional
-- outbox invariant on outbox_events.

CREATE TYPE actor_type AS ENUM (
  'CUSTOMER',
  'STAFF',
  'COURIER',
  'SYSTEM',
  'GUEST'
);

CREATE TYPE identifier_type AS ENUM (
  'EMAIL',
  'PHONE',
  'STAFF_USERNAME'
);

CREATE TYPE account_status AS ENUM (
  'ACTIVE',
  'DISABLED',
  'LOCKED',
  'PENDING_VERIFICATION'
);

-- ─── Identity ───

CREATE TABLE users (
    id                          uuid          PRIMARY KEY DEFAULT uuidv7(),
    actor_type                  actor_type    NOT NULL,
    status                      account_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    primary_identifier          varchar(255)  UNIQUE,
    primary_identifier_type     identifier_type,
    display_name                varchar(120),
    created_at                  timestamptz   NOT NULL DEFAULT now(),
    updated_at                  timestamptz   NOT NULL DEFAULT now(),
    disabled_at                 timestamptz
);

CREATE INDEX idx_users_actor_type ON users(actor_type);
CREATE INDEX idx_users_status ON users(status);

CREATE TABLE staff_profiles (
    user_id                     uuid          PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash               varchar(255),
    password_algo               varchar(32),
    password_updated_at         timestamptz,
    mfa_enabled                 boolean       NOT NULL DEFAULT false,
    mfa_secret_enc              varchar(512),
    mfa_recovery_codes_hash     varchar(1024),
    created_at                  timestamptz   NOT NULL DEFAULT now(),
    updated_at                  timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE customer_profiles (
    user_id                     uuid          PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    phone_normalized            varchar(32)   UNIQUE,
    phone_verified              boolean       NOT NULL DEFAULT false,
    locale                      varchar(16),
    created_at                  timestamptz   NOT NULL DEFAULT now(),
    updated_at                  timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
    id                          uuid          PRIMARY KEY DEFAULT uuidv7(),
    user_id                     uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash          varchar(128)  NOT NULL UNIQUE,
    family_id                   uuid          NOT NULL,
    issued_at                   timestamptz   NOT NULL DEFAULT now(),
    expires_at                  timestamptz   NOT NULL,
    revoked_at                  timestamptz,
    revoked_reason              varchar(64),
    user_agent                  varchar(512),
    ip_address                  varchar(64),
    created_at                  timestamptz   NOT NULL DEFAULT now(),
    updated_at                  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_family_id ON sessions(family_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ─── Roles & permissions ───

CREATE TABLE roles (
    id                          uuid          PRIMARY KEY DEFAULT uuidv7(),
    code                        varchar(64)   NOT NULL UNIQUE,
    name                        varchar(120)  NOT NULL,
    description                 varchar(512),
    is_system                   boolean       NOT NULL DEFAULT false,
    created_at                  timestamptz   NOT NULL DEFAULT now(),
    updated_at                  timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
    id                          uuid          PRIMARY KEY DEFAULT uuidv7(),
    code                        varchar(128)  NOT NULL UNIQUE,
    description                 varchar(512),
    created_at                  timestamptz   NOT NULL DEFAULT now(),
    updated_at                  timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
    role_id                     uuid          NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id               uuid          NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at                  timestamptz   NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

CREATE TABLE user_roles (
    user_id                     uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id                     uuid          NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_by_user_id          uuid          REFERENCES users(id),
    granted_at                  timestamptz   NOT NULL DEFAULT now(),
    expires_at                  timestamptz,
    revoked_at                  timestamptz,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

CREATE TABLE user_branch_scopes (
    user_id                     uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id                   uuid          NOT NULL,
    scope_kind                  varchar(32)   NOT NULL,
    created_at                  timestamptz   NOT NULL DEFAULT now(),
    updated_at                  timestamptz   NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, branch_id)
);

CREATE INDEX idx_user_branch_scopes_branch_id ON user_branch_scopes(branch_id);

-- ─── Address ───

CREATE TABLE addresses (
    id                          uuid          PRIMARY KEY DEFAULT uuidv7(),
    user_id                     uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label                       varchar(64),
    recipient_name              varchar(120)  NOT NULL,
    recipient_phone             varchar(32)   NOT NULL,
    latitude                    decimal(9,6)  NOT NULL,
    longitude                   decimal(9,6)  NOT NULL,
    country_code                varchar(2)    NOT NULL,
    province                    varchar(64),
    city                        varchar(64),
    district                    varchar(64),
    neighborhood                varchar(128),
    street                      varchar(255),
    building_number             varchar(32),
    floor_apartment             varchar(64),
    delivery_note               varchar(512),
    provider_place_id           varchar(255),
    normalized_text             varchar(1024),
    is_default                  boolean       NOT NULL DEFAULT false,
    created_at                  timestamptz   NOT NULL DEFAULT now(),
    updated_at                  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);

-- ─── Audit log (append-only) ───

CREATE TABLE audit_logs (
    id                          uuid          PRIMARY KEY DEFAULT uuidv7(),
    actor_user_id               uuid          REFERENCES users(id),
    actor_type                  actor_type,
    action                      varchar(128)  NOT NULL,
    resource_type               varchar(64)   NOT NULL,
    resource_id                 uuid,
    branch_id                   uuid,
    request_id                  uuid,
    correlation_id              uuid,
    prior_values_json           jsonb,
    new_values_json             jsonb,
    reason                      varchar(512),
    ip_address                  varchar(64),
    user_agent                  varchar(512),
    created_at                  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ─── Outbox event (transactional outbox) ───

CREATE TABLE outbox_events (
    id                          uuid          PRIMARY KEY DEFAULT uuidv7(),
    event_type                  varchar(128)  NOT NULL,
    event_version               integer       NOT NULL DEFAULT 1,
    aggregate_type              varchar(64),
    aggregate_id                uuid,
    payload_json                jsonb         NOT NULL,
    created_by_user_id          uuid          REFERENCES users(id) ON DELETE SET NULL,
    created_at                  timestamptz   NOT NULL DEFAULT now(),
    published_at                timestamptz,
    attempts                    integer       NOT NULL DEFAULT 0,
    last_attempt_at             timestamptz,
    last_error                  varchar(2048)
);

CREATE INDEX idx_outbox_events_event_type ON outbox_events(event_type);
CREATE INDEX idx_outbox_events_published_at ON outbox_events(published_at);
CREATE INDEX idx_outbox_events_aggregate ON outbox_events(aggregate_type, aggregate_id);

-- ─── Business settings ───

CREATE TABLE business_settings (
    id                          uuid          PRIMARY KEY DEFAULT uuidv7(),
    key                         varchar(128)  NOT NULL UNIQUE,
    value_type                  varchar(32)   NOT NULL,
    value_json                  jsonb         NOT NULL,
    category                    varchar(64)   NOT NULL,
    description                 varchar(512),
    mutable                     boolean       NOT NULL DEFAULT true,
    created_at                  timestamptz   NOT NULL DEFAULT now(),
    updated_at                  timestamptz   NOT NULL DEFAULT now(),
    updated_by_user_id          uuid          REFERENCES users(id)
);

CREATE INDEX idx_business_settings_category ON business_settings(category);