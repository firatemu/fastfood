# Cross-platform customer sync foundation

Date: 2026-09-20.  
Authorized by the human owner; this file is the durable foundation record.

Web and Mobile are two clients of one BURGER HOME customer product. Backend / domain / API is the business authority.

```text
                    CUSTOMER PRODUCT
                          |
                BACKEND / DOMAIN / API
                   /              \
          storefront-web      customer-mobile
```

## Existing shared architecture (reused, not duplicated)

| Concern                                   | Package                  | Used by both customer clients                 |
| ----------------------------------------- | ------------------------ | --------------------------------------------- |
| API envelope, error codes, `/api/v1`      | `@fastfood/contracts`    | yes (Mobile via api-client; now also direct)  |
| Fetch client, request IDs, envelope parse | `@fastfood/api-client`   | yes                                           |
| Domain ids / enums (`OrderState`, …)      | `@fastfood/domain-types` | yes                                           |
| Zod request validation                    | `@fastfood/validation`   | API only; clients keep local response schemas |

No new customer-API package. Endpoint wrappers stay in each app because guest/customer session adapters differ (Web cookies/localStorage vs Mobile SecureStore).

## Duplication found

| Symbol                                                  | Web                                                        | Mobile                                       | Action                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `formatTryMinor` / `formatDeltaMinor` / `multiplyMinor` | `apps/storefront-web/src/lib/money.ts`                     | `apps/customer-mobile/lib/money.ts`          | extracted to `@fastfood/contracts`                                 |
| `mapOrderStatusToStitchStepperIndex` + phases           | `apps/storefront-web/src/lib/order-status.ts`              | `apps/customer-mobile/lib/order-status.ts`   | extracted to `@fastfood/contracts`                                 |
| `isPaymentTerminalStatus`                               | `apps/storefront-web/src/lib/storefront/payment-status.ts` | `apps/customer-mobile/lib/payment-status.ts` | extracted to `@fastfood/contracts`                                 |
| Local Zod response schemas                              | `apps/storefront-web/src/lib/schemas.ts`                   | `apps/customer-mobile/lib/schemas.ts`        | left in place (large, session-adjacent; not a silent schema merge) |
| Auth/cart wrappers                                      | `lib/storefront/auth.ts` etc.                              | `lib/auth.ts` etc.                           | left in place (platform session)                                   |
| OSM helpers                                             | env `NEXT_PUBLIC_STOREFRONT_MAP_PROVIDER`                  | env `EXPO_PUBLIC_MAP_PROVIDER`               | left in place                                                      |

## Runtime capability endpoint

`GET /auth/customer/methods` already exists (otp/password/google/apple). Both clients call it.

No new combined readiness endpoint. Push, maps, Masterpass, saved cards, and masked call are not duplicated as a second backend contract; they remain honest client/provider blockers.

## Visual systems

Independent. Do not share DOM/CSS/RN components. No Storefront or Mobile Stitch redesign in this task.

## Drift check

```text
pnpm check:customer-platform
```

Validates registry schema, impact/status enums, no `MISSING`, both client fields, contracts typecheck, both customer clients typecheck against shared contracts.

## Policy / AI rule

- `docs/customer-platform/CUSTOMER_CHANGE_POLICY.md` — same-task evaluation and implementation; **Sync Plan §“Sync Plan” mandatory**.
- `.cursor/rules/35-customer-capability-impact.mdc` — classification authority.
- `.cursor/rules/45-customer-ui-sync.mdc` — operational Sync Plan contract and
  the `pnpm customer-ui:sync:plan` template.
- `ai-prompts/CUSTOMER_CROSS_PLATFORM_CHANGE_RULE.md` — concrete prompt the
  agent pastes into its task preamble before touching customer UI.

## Blockers preserved

- Google / Apple OAuth credentials + native provider setup
- Masterpass / kapıda kart
- Saved-card vault
- Masked call
- Native push device-token / FCM / APNs API
- iOS runtime not verified
