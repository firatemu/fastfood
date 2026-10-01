-- Phase 0 — Enable required PostgreSQL extensions.
-- This migration runs ahead of any business table and is the canonical place
-- to enable PostGIS / uuid-ossp. Document 16 + 35.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
