# Toolchain Version Matrix

**Baseline date:** 2026-09-15  
**Policy:** Pin versions in the repository lockfile/package manifests. Major upgrades require ADR + compatibility validation. Security patch upgrades within the same approved line are expected.

## 1. Runtime and workspace

| Tool | Baseline line | Pin policy |
|---|---|---|
| Node.js | 24 LTS (24.21.x baseline) | `.nvmrc`/tool version + CI image; remain on Node 24 LTS until approved upgrade |
| pnpm | 12.4.x | `packageManager` field + Corepack; exact patch pinned |
| Turborepo | 2.10.x | exact compatible version in root devDependencies |
| TypeScript | 5.9.x | exact patch pinned; do not auto-upgrade to TS 6/7 without compatibility ADR |

Why TypeScript 5.9: the project values ecosystem stability over adopting a compiler transition solely because a newer major exists.

## 2. Web

| Tool | Baseline line | Policy |
|---|---|---|
| Next.js | 16.3.x Active LTS | latest security patch within 16.3 line |
| React Web | 19.3.x where supported by Next baseline | exact compatible patch |
| Tailwind CSS | 4.x | exact patch pinned |
| TanStack Query | current compatible 5.x line | exact patch pinned |
| React Hook Form | current compatible major | exact patch pinned |
| Zod | one shared repository-wide compatible major | exact patch pinned |

## 3. Mobile

| Tool | Baseline line | Policy |
|---|---|---|
| Expo SDK | 57 | Expo-managed compatible package versions |
| React Native | 0.86 | must match Expo SDK 57 compatibility |
| React | Expo-managed compatible version | do not force web React patch into mobile if Expo expects another patch/minor |
| Expo Router | SDK-compatible line | use `expo install` compatibility |

Expo dependencies are installed using `npx expo install` where appropriate so compatible versions are selected.

## 4. Backend

| Tool | Baseline line | Policy |
|---|---|---|
| NestJS | 12.x | same major across `@nestjs/*` packages |
| Fastify | 5.x compatible with Nest baseline | the only HTTP adapter |
| `@nestjs/swagger` | 12.x aligned with NestJS 12 (currently `12.0.1`) | major aligns with NestJS; required because `@nestjs/swagger@11` uses `@nestjs/common/interfaces` deep imports that are not ESM-compatible under Node 24 — see `docs/adrs/ADR-002-nestjs-swagger-12.md` |
| `@fastify/static` | currently `8.2.0` | transitive peer of `@nestjs/swagger@12`; required for Swagger UI static assets |
| Pino | current compatible stable line | the only backend structured logging family |
| Prisma ORM | 7.10.x line | stay on Prisma 7 while Prisma 8 is pre-GA/early transition; upgrade only through ADR |
| PostgreSQL | 18.6+ patch line | latest supported security patch within 18 |
| PostGIS | 3.6.x stable | do not use 3.7 RC/beta for production baseline |
| Redis Open Source | 8.10.x | exact patch pinned (currently `8.10.1-trixie`, recorded in `infrastructure/docker/docker-compose.yml`); current security-patched stable 8.x line compatible with deployment image (see `docs/adrs/ADR-001-redis-8.10-baseline.md`) |
| BullMQ | 6.3.x or later compatible 6.x | exact package version pinned |

## 5. Code quality

| Tool | Baseline line | Policy |
|---|---|---|
| ESLint | 9.x | shared root/project configuration; no per-app competing lint stack |
| Prettier | 3.x | one repository formatting config |

## 6. Testing

| Tool | Baseline line | Policy |
|---|---|---|
| Vitest | 5.x | exact patch pinned |
| Playwright | 1.63.x | exact patch + browser artifacts controlled by CI |
| Maestro | current stable CLI at bootstrap | CLI version must be recorded in CI config; upgrades reviewed |

## 7. Version drift rule

AI agents must not run blanket commands such as `pnpm update --latest` and commit resulting major upgrades.

When a package version is not listed here:

1. use the version compatible with the locked framework line,
2. pin it in the lockfile,
3. avoid duplicate libraries for the same role,
4. update this matrix if the package becomes an architectural dependency.

## 8. Upgrade process

For major/framework upgrades:

- read official migration/security notes,
- create ADR,
- create migration branch,
- update one concern at a time,
- run full type/lint/test/build/E2E suite,
- verify Expo native builds if mobile dependencies changed,
- verify database migration tooling if Prisma/PostgreSQL changed.
