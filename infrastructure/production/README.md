# FASTFOOD VPS environment (ADR-021)

Owner-activated single environment on the VPS `srv1129150` (`76.13.14.43`),
managed by Coolify as the Docker Compose application **fastfood-burger**
(project **FastfoodBurger**, environment `production`) built from
`docker-compose.coolify.yml` on `main` of `github.com/firatemu/fastfood`.
Providers are sandbox/fake only; see ADR-021 for scope.

| Host                     | Compose service | Container port |
| ------------------------ | --------------- | -------------- |
| `apiburger.azem.cloud`   | `api`           | 4000           |
| `burger.azem.cloud`      | `storefront`    | 3000           |
| `mapburger.azem.cloud`   | `storefront`    | 3000           |
| `adminburger.azem.cloud` | `admin`         | 3000           |
| `kuryeburger.azem.cloud` | `courier`       | 3000           |
| `qrburger.azem.cloud`    | `qr`            | 3000           |
| `menu.azem.cloud`        | `qr`            | 3000           |

PostgreSQL, Redis and MinIO have no public port. DNS A records live in the
Hostinger zone of `azem.cloud`.

## Deploy

Push to `main`, then press **Deploy** in Coolify (or `POST /api/v1/deploy`
with the application uuid). There is no automatic CD. The `migrate` service
runs `prisma migrate deploy` once per deploy before `api` starts.

`NEXT_PUBLIC_*` values and `QR_MENU_MEDIA_ORIGIN` are build arguments, so a
domain change needs a rebuild, not only a restart.

## Environment variables

Names and defaults: `.env.production.example`. `SERVICE_PASSWORD_*` values are
generated and kept by Coolify. `JWT_*_KEY_B64` are base64 PEM files; the API
entrypoint (`api-entrypoint.sh`) writes them to a private temp dir at start.
iyzico sandbox keys are empty until the owner adds them, so card payments fail
until then.

## MinIO image

`minio/minio:RELEASE.2025-09-07T16-13-09Z` can no longer be pulled from
Docker Hub or quay.io. The service uses `pull_policy: never`; the image must
exist on the host. To restore it on a new host:

```sh
docker save minio/minio:RELEASE.2025-09-07T16-13-09Z | gzip | ssh <host> 'gunzip | docker load'
```

## Backups

Coolify scheduled task `postgres-backup` (daily 03:00) runs `pg_dump -Fc` inside
the `postgres` container into the `fastfood-postgres-backups` volume and keeps
14 days. Restore:

```sh
docker exec -i <postgres container> pg_restore -U fastfood -d fastfood --clean --if-exists --no-owner /backups/<file>.dump
```

## Android release APKs

```sh
FASTFOOD_RELEASE_KEYSTORE=... FASTFOOD_RELEASE_KEYSTORE_PASS=... FASTFOOD_RELEASE_KEY_ALIAS=fastfood-release \
  scripts/android-build-release.sh customer-mobile   # or courier-mobile
```

The keystore and its password are kept outside Git. Losing them means future
APKs cannot update installed apps in place.

Google Play internal / closed testing (customer app only, ADR-023): add `aab`
as the second argument to produce
`apps/customer-mobile/android/app/build/outputs/bundle/release/app-release.aab`.
The keystore is the Play **upload key**; enroll in Play App Signing. Increment
`android.versionCode` in `apps/customer-mobile/app.json` before every upload.
Store listing and Data safety answers: `docs/release/PLAY_CONSOLE_CUSTOMER.md`.
