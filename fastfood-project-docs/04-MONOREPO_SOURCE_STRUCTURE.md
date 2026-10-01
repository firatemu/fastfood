# Monorepo and Source Structure

## 1. Locked repository layout

The repository root must follow this baseline:

```text
fastfood/
  apps/
    api/
    worker/
    storefront-web/
    admin-web/
    customer-mobile/
    courier-mobile/
  packages/
    api-client/
    config/
    contracts/
    design-tokens/
    domain-types/
    eslint-config/
    observability/
    test-utils/
    tsconfig/
    ui-native/
    ui-web/
    validation/
  infrastructure/
    docker/
    scripts/
  docs/
  .github/
    workflows/
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
  turbo.json
  README.md
```

Agents must not rename top-level areas or introduce parallel architectural roots such as `services/`, `projects/`, or `libs/` unless the source structure specification is intentionally revised.

During Development-Only / Human-Validation Mode, deployment-provider directories such as `infrastructure/coolify/` must **not** be scaffolded. They may be introduced only after an explicit release/deployment activation decision under document 49.

## 2. Backend source layout

```text
apps/api/src/
  bootstrap/
  common/
  modules/
    auth/
    identity/
    customers/
    catalog/
    branches/
    service-areas/
    carts/
    pricing/
    checkout/
    payments/
    loyalty/
    promotions/
    orders/
    kitchen/
    couriers/
    deliveries/
    notifications/
    reporting/
    audit/
    media/
    settings/
```

The worker reuses application/domain code through approved backend packages or shared source boundaries. Do not duplicate domain logic into `apps/worker`.

## 3. Web structure

Each Next.js app uses App Router.

Canonical structure:

```text
app/
components/
features/
lib/
providers/
styles/
```

Rules:

- route files compose features; they do not contain large business logic,
- domain API access goes through the canonical API client,
- reusable production UI comes from `@fastfood/ui-web`,
- local page-specific composition is allowed, local replacement of foundational components is not.

## 4. Mobile structure

Expo Router is used for navigation.

Canonical structure:

```text
app/
features/
providers/
services/
state/
```

Reusable production primitives come from `@fastfood/ui-native`.

## 5. Dependency direction

A package must not depend on an application.

Canonical direction:

```text
apps -> shared packages
ui-web -> design-tokens
ui-native -> design-tokens
api-client -> contracts/domain-types
contracts -> validation/domain-types where required
```

Circular workspace dependencies are forbidden.

## 6. Path and file naming

Detailed naming conventions are defined in `34-CODEBASE_CONVENTIONS.md` and are mandatory.
