# ADR-022: Real iyzico sandbox Checkout Form integration

Status: Accepted
Date: 2026-10-12
Decision owners: Human owner
Authorization basis: explicit human-owner instruction in the working session of
2026-10-12 — the owner supplied iyzico sandbox API keys for the ADR-021 VPS
environment and chose "Gerçek iyzico sandbox entegrasyonu yaz (Checkout Form +
3D Secure, imzalı callback, web + mobil, ADR ile)".

## Context

Document 10 §4–5 already prescribes the canonical flow: the backend initializes
iyzico with a server-derived amount, the customer completes the provider page,
and only a backend verification with iyzico may move a payment to paid. A
redirect is never proof of payment.

The implementation shipped until now was an in-memory stub
(`IyzicoSandboxAdapter`): it never called iyzico, and
`POST /integrations/iyzico/{callback,webhook}` accepted
`{ providerPaymentId, status: 'PAID' }` from any caller. The storefront showed a
local card form and called that webhook itself. On the public ADR-021
environment this let anyone mark an unpaid checkout as paid.

## Decision

1. **Provider surface.** iyzico **Checkout Form** (hosted payment page with
   3-D Secure). Card data is entered only on iyzico's page; FASTFOOD never
   receives or stores PAN/CVC.
2. **No SDK.** The adapter talks to the iyzico REST API with the documented
   `IYZWSv2` HMAC-SHA256 authorization built from `node:crypto` and the global
   `fetch`. No new npm dependency (document 33 unchanged).
3. **Gateway switch.** `PAYMENT_GATEWAY = iyzico | simulated`
   (default `simulated`). `simulated` keeps the previous deterministic adapter
   (renamed `SimulatedPaymentAdapter`) for local development, unit/integration
   tests and Playwright. `simulated` is rejected when `NODE_ENV=production`.
4. **Verification.** `initialize` stores the Checkout Form `token` as
   `providerPaymentId`. The callback, the webhook and the status endpoint all
   call Checkout Form _retrieve_ with that token. A payment becomes `PAID` only
   when iyzico reports `paymentStatus = SUCCESS`, the `basketId` equals the
   checkout session id and the `price` equals the persisted attempt amount.
   `FAILED` only on an explicit `FAILURE`; anything else stays `PENDING`. A
   `PAID` attempt is never downgraded. Duplicate callbacks are idempotent.
5. **Client-asserted status.** In `iyzico` mode the callback/webhook ignore any
   client-sent `status`; they only trigger verification. A client-asserted
   `PAID` is honoured only in `simulated` mode.
6. **Return channels.** `POST /checkout/payment/initialize` accepts
   `returnChannel: web | mobile`. After verification the callback answers
   `303` to `${STOREFRONT_PUBLIC_URL}/payment/{checkoutSessionId}` (web) or
   `fastfoodcustomer://payment/return?checkoutId={checkoutSessionId}` (mobile,
   the existing provider-return route). Both screens
   still read the outcome from `GET /checkout/status/{id}`.
7. **Buyer data.** iyzico requires buyer fields FASTFOOD does not collect.
   Sandbox-safe fallbacks are used: name from the display/guest name
   (`Musteri` otherwise), phone/e-mail from the primary identifier, a synthetic
   `@example.com` e-mail (iyzico rejects reserved TLDs such as `.invalid`) when none exists, `identityNumber 11111111111`,
   and a generic Istanbul address. A single basket item carries the total.
   Collecting real buyer identity data is a production decision and is not
   made here.
8. **Form posts.** iyzico posts the callback as an HTML form; the NestJS
   Fastify adapter already parses `application/x-www-form-urlencoded`, so no
   extra body parser or dependency is added.

## Consequences

- The ADR-021 environment runs `PAYMENT_GATEWAY=iyzico` against
  `https://sandbox-api.iyzipay.com` with the owner's sandbox keys stored only in
  Coolify. Production iyzico credentials remain prohibited.
- Storefront Web and Customer Mobile redirect to iyzico's page instead of
  showing an in-app card form (`iyzico-pay`: Web and Mobile
  `CHANGE_REQUIRED` → `IMPLEMENTED`).
- Refunds/cancellations through iyzico and the reconciliation job (document 10
  §7–10) are not part of this ADR.
