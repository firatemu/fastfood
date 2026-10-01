#!/bin/sh
# Create the integration test database used by the API's integration test harness.
# Local development only.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE fastfood_test;
    \c fastfood_test
    CREATE EXTENSION IF NOT EXISTS postgis;
EOSQL

echo "fastfood_test database initialized with PostGIS."
