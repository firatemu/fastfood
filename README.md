# FASTFOOD

Single-company, multi-branch fast-food commerce and delivery platform.

## Current state

Canonical development Phases 0–10 are technically complete. Admin,
Storefront, and Customer Mobile transformations are ready for local human QA.
Final human acceptance has not been granted.

Deployment and production remain prohibited. Use only local development,
local Docker infrastructure, CI verification, emulators/devices, and sandbox
providers.

See `PROJECT_STATUS.md` for the machine-readable current state.

## Start here

AI agents and contributors should read only the documents relevant to their
task:

1. `AGENTS.md`
2. `PROJECT_STATUS.md`
3. `fastfood-project-docs/00-FASTFOOD_PRODUCT_AND_SYSTEM_SPEC.md`
4. `fastfood-project-docs/32-IMPLEMENTATION_LOCK_IN.md`
5. `fastfood-project-docs/43-AI_AGENT_DEVELOPMENT_PROTOCOL.md`
6. `fastfood-project-docs/49-DEVELOPMENT_EXECUTION_AND_HUMAN_VALIDATION_POLICY.md`
7. The task-specific documents routed by `docs/README.md`
8. Nearby code and tests

Do not preload historical phase reports. The active repository retains only
the final technical summary and final human test plan under
`project-reports/final/`.

## Workspace

- `apps/api` — NestJS API and Prisma schema
- `apps/worker` — BullMQ worker
- `apps/storefront-web` — customer Storefront
- `apps/admin-web` — HQ and branch operations
- `apps/customer-mobile` — customer iOS/Android app
- `apps/courier-mobile` — courier iOS/Android app
- `packages/` — shared contracts, configuration, UI, and infrastructure code
- `fastfood-project-docs/` — authoritative product and engineering contracts
- `docs/` — ADRs and current task-specific design/QA documentation
- `project-reports/final/` — final completion summary and human test plan only

## Local development

Prerequisites: Node.js 24 LTS, pnpm 12, Docker, and Docker Compose.

```sh
corepack enable
pnpm install
cp .env.example .env
cp .env apps/api/.env
cp .env apps/worker/.env
pnpm keys:dev
pnpm db:generate
pnpm infra:up
pnpm db:migrate:deploy
pnpm db:seed
```

Run surfaces as needed:

```sh
pnpm --filter @fastfood/api start:dev
pnpm --filter @fastfood/storefront-web dev
pnpm --filter @fastfood/admin-web dev
pnpm --filter @fastfood/courier-mobile dev
```

Courier Mobile starts Expo/Metro on port `8082`. The default API URL is
`http://localhost:4000/api/v1`; for an Android emulator, start it with
`EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000/api/v1` so the emulator can
reach the local API. Physical devices need a host LAN URL reachable from the
device.

## Verification

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm db:validate
```

Passing automated checks means technically ready for human validation; it does
not grant human acceptance or deployment authorization.
