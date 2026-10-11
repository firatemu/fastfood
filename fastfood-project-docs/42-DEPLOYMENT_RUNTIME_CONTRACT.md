# Deferred Deployment and Future Runtime Contract

## 0. Activation (2026-10-11)

**PARTIALLY ACTIVE — see ADR-021.** The product owner explicitly activated a
single owner-operated VPS environment on Coolify (`*.azem.cloud`) with sandbox
providers and APK-only mobile distribution. The sections below remain binding
for that environment; every item of §2 not covered by ADR-021 (production
iyzico, production SMS OTP, store distribution, CD workflows) stays prohibited.

## 1. Status

**Historical: INACTIVE / FUTURE REFERENCE ONLY** (superseded by §0 for the
ADR-021 environment).

The FASTFOOD project is currently in Development-Only / Human-Validation Mode. No remote deployment is authorized. Document `49-DEVELOPMENT_EXECUTION_AND_HUMAN_VALIDATION_POLICY.md` takes precedence for current execution.

This file preserves the intended future production architecture so the application remains deployable later without contaminating current development with production operations.

## 2. Actions prohibited in the current phase

Do not:

- create or configure a Coolify application,
- deploy to a VPS or any remote host,
- create public production/staging domains for this project,
- configure production TLS/reverse proxy,
- request or configure production secrets,
- enable real iyzico credentials,
- enable a production SMS OTP provider,
- publish server images for deployment,
- execute remote database migrations,
- distribute mobile apps through production/beta store channels,
- create automated deployment workflows.

Local Docker images/Compose services and CI build verification remain allowed.

## 3. Planned future target

If and only if deployment is later explicitly activated by the product owner, the planned baseline is:

- Ubuntu 24.04 LTS VPS
- Docker
- Coolify
- GitHub repository integration
- PostgreSQL 18 + PostGIS 3.6
- Redis 8
- S3-compatible object storage

Infrastructure code must remain portable to another Docker-capable host.

## 4. Planned future server processes

- `api`
- `worker`
- `storefront-web`
- `admin-web`

Customer/courier mobile apps communicate with the same API once a future remote environment exists.

## 5. Future production principles

When this contract is eventually activated:

- secrets remain outside Git,
- deployable server images use multi-stage/minimal builds,
- processes run non-root where practical,
- readiness/liveness endpoints are used,
- database migrations run as controlled jobs,
- schema mutation is not performed concurrently by app replicas,
- destructive migrations use explicit expand/contract or approved migration plans,
- production data/storage has backup and restore policy,
- CORS/CSP/cookies are limited to intended origins,
- mobile API changes preserve compatibility windows.

## 6. Activation gate

This document becomes executable only after all of the following occur:

1. the product owner explicitly authorizes release/deployment work,
2. document 49 is updated from Development-Only mode,
3. `PROJECT_STATUS.md` is updated,
4. a dedicated deployment/release prompt is approved,
5. human acceptance criteria for the intended release are satisfied.

Until then, an AI agent must treat every deployment instruction in older/contextual material as non-executable future reference.
