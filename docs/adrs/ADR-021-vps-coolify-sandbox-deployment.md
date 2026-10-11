# ADR-021: VPS deployment on Coolify with sandbox providers

Status: Accepted
Date: 2026-10-11
Decision owners: Human owner
Authorization basis: explicit human-owner instruction in the working session of
2026-10-11 — "projemizi vps sunucumuzda canlıya alacağız. canlıya alırken veri
tabanı bilgileri ve tüm ortamları ile yayına alacaz. mobil uygulamada dahil" —
followed by the owner's explicit choices: Coolify + GitHub repository source,
iyzico sandbox + fake OTP, migrate the local database dump, Android release APK
(no store distribution).

## Context

Documents 42 and 49 kept deployment `PROHIBITED / DEFERRED` until the owner
explicitly activated it. Document 42 §3 already named the intended target
(Ubuntu 24.04 VPS, Docker, Coolify, GitHub integration, PostgreSQL 18 + PostGIS
3.6, Redis 8, S3-compatible storage). The owner's VPS `srv1129150`
(`76.13.14.43`) already runs Coolify 4.3.x with its Traefik proxy on 80/443 and
hosts unrelated projects.

## Decision

1. Deployment is activated for a **single owner-operated environment** on the
   VPS, managed by Coolify as a Docker Compose resource built from
   `infrastructure/production/docker-compose.coolify.yml` in
   `github.com/firatemu/fastfood`.
2. Public hosts (TLS via Coolify/Traefik + Let's Encrypt):

   | Host                     | Service                                     |
   | ------------------------ | ------------------------------------------- |
   | `burger.azem.cloud`      | `storefront-web`                            |
   | `adminburger.azem.cloud` | `admin-web`                                 |
   | `kuryeburger.azem.cloud` | `courier-web`                               |
   | `qrburger.azem.cloud`    | `qr-menu`                                   |
   | `mapburger.azem.cloud`   | `storefront-web` (address-map frame origin) |
   | `apiburger.azem.cloud`   | `api`                                       |

   PostgreSQL, Redis and MinIO are never published; product media is served
   through the API `public/media` proxy.

3. Providers stay in **sandbox / fake** mode: `IYZICO_USE_SANDBOX=true`,
   `OTP_PROVIDER=fake`, `CUSTOMER_REGISTRATION_OTP_SUSPENDED=true` (ADR-010).
   Switching any provider to production requires a new ADR.
4. Initial data is the owner's local development database (dump/restore) plus
   a mirror of the local MinIO bucket. Seeded/local passwords are rotated after
   restore.
5. Mobile apps are distributed as signed Android release APKs that target
   `https://apiburger.azem.cloud/api/v1`. Store / TestFlight / Play track
   publication remains prohibited.
6. Migrations run once per deploy in a dedicated `migrate` job
   (`prisma migrate deploy`) before the API starts; app replicas never mutate
   the schema.
7. Staff TOTP verification is not implemented, and the development MFA bypass
   is disabled under `NODE_ENV=production`, which would make admin and courier
   sign-in impossible. The owner chose (2026-10-11) an explicit
   `STAFF_MFA_BYPASS=true` switch for this environment only: staff/courier
   sign-in is password-only and the API logs a warning at startup. Removing
   the switch requires real TOTP MFA first.
8. No CD: deploys are triggered manually in Coolify (or by the owner's Coolify
   webhook). CI remains verification-only.

## Consequences

- `PROJECT_STATUS.md` keeps `Deployment = PROHIBITED / DEFERRED` and
  `Production = NOT ACTIVE`: those rows bind the Autonomous Development
  Controller, which still may not deploy on its own. The owner-directed
  environment is recorded in its own row.
- New runtime setting `API_PUBLIC_URL` (absolute origin used to build public
  media URLs); defaults to `http://localhost:${API_PORT}` for local development.
- Next.js apps build with `output: 'standalone'`; `NEXT_PUBLIC_*` values are
  build arguments.
- Secrets (DB/MinIO/Redis passwords, `API_DEV_SECRET`, `OTP_HMAC_PEPPER`, JWT
  RS256 keypair) live only in Coolify; `.env.production.example` lists names.
- Human acceptance (`HUMAN_ACCEPTED`) is still owner-only; this ADR does not
  declare the product production-ready.
