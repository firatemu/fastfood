# E2E Test Foundation

Playwright + Maestro foundations live here.

## Web — Playwright (`@fastfood/e2e-web`)

```sh
pnpm --filter @fastfood/e2e-web install-browsers
pnpm --filter @fastfood/e2e-web test
```

The Playwright config boots:

- `@fastfood/api` on `API_PORT` (default `4000`)
- `@fastfood/storefront-web` on `STOREFRONT_PORT` (default `3000`)
- `@fastfood/admin-web` on `ADMIN_PORT` (default `3001`)

## Mobile — Maestro

Maestro flows are organized under each mobile app:

- `apps/customer-mobile/.maestro/`
- `apps/courier-mobile/.maestro/`

The directory structure is reserved by Phase 0; real customer/courier journeys
are added in Phases 5 and 8 respectively. CI installs the Maestro CLI as a
documented step rather than committing the binary.
