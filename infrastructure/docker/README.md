# Local Development Infrastructure

This folder contains **local development only** infrastructure configuration.
It must never be used to provision or manage a remote environment.

Services provided by `docker-compose.yml`:

| Service    | Image                            | Port (host)   | Purpose                          |
| ---------- | -------------------------------- | ------------- | -------------------------------- |
| `postgres` | `postgis/postgis:18-3.6`                   | `5439`        | PostgreSQL 18 + PostGIS 3.6      |
| `redis`    | `redis:8.10.1-trixie`                      | `6388`        | Redis 8 (cache + BullMQ backend) |
| `minio`    | `minio/minio:RELEASE.2025-09-07T16-13-09Z` | `9098`/`9099` | S3-compatible object storage     |

## Usage

```sh
# start
pnpm infra:up

# check status
pnpm infra:ps

# tail logs
pnpm infra:logs

# stop (preserves data volumes)
pnpm infra:down
```

Health checks are configured for every service. The integration test database
`fastfood_test` is created by `scripts/postgres-init/01-create-test-db.sh` on
first startup of the PostgreSQL container.

## Resetting local data

```sh
pnpm infra:down
docker volume rm fastfood-local_postgres-data fastfood-local_redis-data fastfood-local_minio-data
pnpm infra:up
```

## Not allowed

- No TLS termination here (development only).
- No public domain binding.
- No remote credentials.
- No production data.
