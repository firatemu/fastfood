-- Phase 0 — Create the foundation probe table that validates the
-- UUIDv7 + BigInt + UTC conventions end to end. Document 35.

CREATE TABLE foundation_probes (
    id            uuid        PRIMARY KEY DEFAULT uuidv7(),
    label         varchar(120) NOT NULL,
    amount_minor  bigint       NOT NULL DEFAULT 0,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now()
);
