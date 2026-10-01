# FASTFOOD — Full Project Human Test Plan

> **Status:** Ready for human owner acceptance testing.
> **Deployment:** PROHIBITED / DEFERRED
> **Production:** NOT ACTIVE
> **iyzico:** SANDBOX ONLY

## 1. Scope

End-to-end product acceptance across all canonical development phases (0–10).

## 2. Environments

| Surface | How to run (local) |
|---|---|
| API | `pnpm --filter @fastfood/api start:dev` (with `pnpm infra:up`) |
| Storefront web | `pnpm --filter @fastfood/storefront-web dev` |
| Admin web | `pnpm --filter @fastfood/admin-web dev` |
| Customer mobile | Expo (`apps/customer-mobile`) |
| Courier mobile | Expo (`apps/courier-mobile`) |

## 3. Scenario matrix

### H-AUTH — Identity

1. Customer register / OTP / login / logout
2. Staff login with RBAC
3. Courier login (staff identity + courier profile)
4. Disabled account rejected
5. Unauthenticated privileged routes rejected

### H-CATALOG-BRANCH — Catalog & branch

1. Browse categories/products/allergens
2. Branch list + serviceability for a known address
3. Out-of-area address not serviceable

### H-CART-CHECKOUT — Cart, pricing, payment

1. Guest cart → add/update/remove lines
2. Login merge guest → customer cart
3. Checkout quote matches document 37 expectations
4. Loyalty reserve / release
5. iyzico **sandbox** payment initialize + status
6. Idempotent payment replay

### H-ORDER-KITCHEN — Orders

1. Paid order auto-assigns branch
2. Branch dashboard lists order
3. Kitchen board: accept → preparing → ready
4. Invalid status jump rejected
5. Manual branch reassignment preserves history

### H-COURIER — Delivery

1. Admin assign courier OR QR claim
2. Pickup → on-the-way → deliver
3. Google Maps navigation deep link opens
4. Live location accepted only for owned active delivery
5. Capacity limit enforced

### H-REFUND-REPORT — Finance ops

1. Partial refund succeeds; over-refund rejected
2. Sales / branch / product / courier reports readable by `reports.read`

### H-A11Y-RESPONSIVE

1. Storefront/admin primary actions usable by keyboard
2. Mobile touch targets acceptable on supported devices

## 4. Pass criteria

- All blocking scenarios PASS
- No production credentials used
- No deployment performed
- Sandbox payment only
- Human owner records acceptance in `PROJECT_STATUS.md` (agent must not self-accept)

## 5. Out of scope

- Staging/production deploy
- Coolify / VPS / public TLS
- Live iyzico production keys
- App Store / Play Store release
