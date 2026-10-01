# Development Environments, CI, Local Runtime, and Observability

## 1. Current execution mode

FASTFOOD is currently in **Development-Only / Human-Validation Mode**.

Enabled execution contexts:

- Local developer environment
- Automated test/CI environment
- Local device/simulator development for mobile applications

Inactive/deferred contexts:

- Staging deployment
- Production deployment
- Coolify deployment
- Public internet release
- App Store / Play Store / TestFlight or equivalent remote distribution

Document `49-DEVELOPMENT_EXECUTION_AND_HUMAN_VALIDATION_POLICY.md` is authoritative for this mode.

## 2. Local containers

Local infrastructure uses Docker Compose (or the project-owned equivalent) for:

- PostgreSQL 18 + PostGIS 3.6
- Redis 8
- MinIO

Application processes may run directly from the monorepo during development unless a local container is specifically useful.

No remote host, public domain, TLS certificate, Coolify project, or deployment secret is required for repository bootstrap or feature development.

## 3. CI — verification only

GitHub Actions is used as a **verification pipeline, not a deployment pipeline**.

At minimum CI runs:

- dependency install with frozen lockfile,
- formatting check,
- lint,
- type check,
- unit tests,
- integration tests where the CI environment permits,
- build,
- required web E2E tests,
- migration/schema validation,
- dependency/security checks.

CI must not:

- deploy an application,
- call Coolify deployment hooks,
- publish production containers,
- configure production infrastructure,
- use production credentials,
- publish mobile applications.

## 4. Human validation

Feature completion is not equivalent to acceptance. Each meaningful feature/phase must pass:

1. automated checks,
2. local integrated verification,
3. human functional testing by the product owner/team,
4. correction of blocking findings,
5. explicit human acceptance before the next major phase is treated as stable.

Human testing may use browser localhost, local network access where intentionally configured, emulators/simulators, or development-installed mobile builds. It does not authorize remote deployment.

## 5. Health endpoints

The backend exposes liveness/readiness endpoints even during development because they are useful for local orchestration, automated tests, and future operations. Their existence does not authorize deployment.

## 6. Observability during development

Development baseline includes:

- structured logs,
- request/correlation IDs,
- local error visibility,
- queue failure visibility,
- provider sandbox error visibility,
- health checks,
- critical business-event logging without leaking secrets/PII.

Remote production monitoring providers are deferred unless separately approved for development use.

## 7. Local data and resetability

Development databases and object storage must be disposable/reproducible from migrations and deterministic seed data.

Development backup/restore tooling may be tested locally where useful, but production backup operations are outside the active scope.

## 8. Secrets

Secrets never belong in Git. `.env.example` contains names and safe descriptions only.

Current development uses only development/sandbox/test credentials. Production credentials must not be requested, stored, configured, tested, or inferred during the active development-only phase.

## 9. Future deployment architecture — inactive reference

The planned future production target remains Docker on Ubuntu 24.04 LTS with Coolify as documented in `42-DEPLOYMENT_RUNTIME_CONTRACT.md`. This is architectural foresight only.

**No agent or human developer is authorized by this document to deploy anything.** Activation requires a future explicit product-owner decision and an approved change to document 49/project status.
