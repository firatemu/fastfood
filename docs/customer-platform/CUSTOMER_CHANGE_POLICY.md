# Customer change policy

Web-first in workflow does not mean Web-only.

The human owner may request a customer change from the Storefront perspective. Engineering completion still means the capability was evaluated across **backend + `apps/storefront-web` + `apps/customer-mobile`**.

The owner should not need a second prompt that says “now do Mobile too.”

## Same-task evaluation

For every future customer-facing feature or behavior change, the same engineering task must evaluate:

1. backend / domain impact
2. Storefront Web impact
3. Customer Mobile impact
4. API compatibility
5. security / data integrity
6. test impact

Then classify each client as exactly one of:

- `AUTOMATICALLY_SUPPORTED`
- `CHANGE_REQUIRED`
- `NOT_APPLICABLE`

Implementation status is separate (`IMPLEMENTED`, `EXTERNAL_PROVIDER_BLOCKED`, …). See `CUSTOMER_CAPABILITY_MATRIX.md`.

## Same-task implementation

If a client is `CHANGE_REQUIRED`, implement it in the same task unless:

- an external provider blocks it (`CHANGE_REQUIRED` + `EXTERNAL_PROVIDER_BLOCKED`)
- a platform-specific prerequisite is unavailable
- the human owner explicitly approves deferment

Do not use `NOT_APPLICABLE` to mean “required but blocked.”

Do not redesign Mobile because Web changed. Preserve platform-native UX (ADR-008). Do not share Web DOM/CSS with React Native.

### Sync Plan (required by `.cursor/rules/45-customer-ui-sync.mdc`)

Before editing `apps/storefront-web/src` or `apps/customer-mobile/app`, the
implementer must produce the Sync Plan. The plan covers:

1. Capability affected (registry id)
2. Web surface files
3. Mobile surface files
4. Shared contract deltas
5. Capability registry row movement (webImpact / webStatus / mobileImpact / mobileStatus)
6. Verification gates (must all be green)

Print the template via:

```sh
pnpm customer-ui:sync:plan "<capability name>"
```

The plan is recorded in the work-item report. No single-client Web or Mobile
edit is accepted without a Sync Plan entry.

### Drift

If Web and Mobile ever diverge on the same capability id, the operator rule
is **sync the lagging client**, do not change the leading one to match.

## Typical patterns

| Kind of change | Web | Mobile |
| --- | --- | --- |
| New product / catalog / CMS / Club / legal data | often `AUTOMATICALLY_SUPPORTED` | often `AUTOMATICALLY_SUPPORTED` |
| New customer workflow or screen | often `CHANGE_REQUIRED` | often `CHANGE_REQUIRED` |
| Browser-only behavior | `CHANGE_REQUIRED` | `NOT_APPLICABLE` |
| Native camera / Back / FCM | `NOT_APPLICABLE` | `CHANGE_REQUIRED` |

## API evolution

Prefer additive, backward-compatible API changes.

For an unavoidable breaking change, update in the same change:

- shared contract (`@fastfood/contracts`)
- Web
- Mobile
- tests
- capability registry metadata

## Registry updates

When a customer capability is added or its impact/status changes, update:

- `packages/contracts/src/customer-capability-registry.ts`
- `docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md`

Then run `pnpm check:customer-platform`.
