# Codebase Conventions

## 1. Language

Source code, identifiers, comments that explain architecture, commit/PR technical descriptions, API names, database identifiers, and documentation are written in English.

Customer-facing text may be Turkish through localization/message resources.

## 2. File naming

Use `kebab-case` for ordinary source filenames unless framework convention requires another form.

Examples:

```text
order-pricing.service.ts
branch-scope.policy.ts
product-card.tsx
use-checkout-quote.ts
```

Framework-required files such as `page.tsx`, `layout.tsx`, and Expo Router route files follow framework conventions.

## 3. Type/class naming

- Classes/components/types/interfaces/enums: `PascalCase`
- Functions/variables/properties: `camelCase`
- Constants: `UPPER_SNAKE_CASE` only for true module/static constants
- Permission codes: dotted lower-case strings
- Environment variables: `UPPER_SNAKE_CASE`
- DB identifiers: `snake_case`

## 4. DTO and contract naming

Use clear action/resource semantics:

- `CreateProductRequest`
- `CreateProductResponse`
- `UpdateBranchRequest`
- `CheckoutQuoteRequest`
- `CheckoutQuoteResponse`

Nest-only transport DTO classes may use `Dto` suffix if required by framework tooling, but shared contracts should use `Request`/`Response` naming consistently.

Do not create multiple shapes for the same API payload in different apps.

## 5. Service naming

Use business-purpose names:

- `CheckoutService`
- `PricingService`
- `BranchRoutingService`
- `LoyaltyReservationService`

Avoid generic names like `HelperService`, `UtilsService`, or `Manager` without a bounded purpose.

## 6. Event naming

Past tense:

- `OrderPaid`
- `OrderDelivered`
- `PaymentFailed`

Event class/type identifiers use PascalCase; serialized event names may use a documented stable dotted form such as `order.delivered.v1`.

## 7. Boolean naming

Use positive semantic prefixes:

- `isActive`
- `isAvailable`
- `hasPermission`
- `canRefund`

Avoid double negatives.

## 8. Function size and responsibilities

A function should do one coherent job. Large orchestration functions may coordinate services, but calculation and policy logic should be extracted into testable functions/classes.

## 9. Comments

Comments explain **why**, invariants, external-provider quirks, or non-obvious constraints. Do not narrate obvious code line by line.

## 10. Imports

- use workspace package aliases,
- avoid deep private imports from another package,
- expose package public APIs through explicit exports,
- no circular dependencies.

## 11. TypeScript strictness

Repository TypeScript configuration must enable strict type checking. Avoid `any`. If an untyped provider boundary requires unknown input, accept `unknown`, validate, then narrow.

## 12. Error handling

Throw/project canonical domain/application errors; do not throw raw provider error objects to clients.

## 13. Logging

Do not use ad-hoc production `console.log`. Use the structured logger with context/correlation fields.

## 14. Date/time

Use UTC instants in domain persistence. Formatting for Europe/Istanbul occurs at presentation/report boundaries.

## 15. Money

Domain/persistence monetary values use `bigint` semantics and unambiguous names such as `amountMinor`, `unitPriceMinor`, and `deliveryFeeMinor`.

At the JSON boundary they are serialized as base-10 integer strings through the shared money serializer/contract. API consumers parse them through the project money utility; they do not call `Number(...)` arbitrarily in feature code.

Never name a formatted UI string as though it were canonical money.

## 16. Tests

Test names describe behavior:

```text
it('releases reserved points when verified payment fails')
```

Avoid test names tied only to internal method names.
