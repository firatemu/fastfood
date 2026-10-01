# 16 — Human QA test data (local / dev only)

Safe fixtures for BURGER HOME Storefront human testing.

**Do not use in production. Do not commit secrets. Do not paste live provider keys here.**

Storefront: `http://localhost:3100/`  
API: `http://localhost:4000/api/v1`

## Bring-up (local)

Typical sequence already used in this repo:

1. `pnpm infra:up`
2. `pnpm db:migrate:deploy && pnpm db:seed`
3. API + Storefront dev servers on `:4000` and `:3100`

OTP provider in local `.env`: `OTP_PROVIDER=fake`. Fixed code is **not a production secret**; it is the documented fake provider value.

## Customer auth

| Item | Value | Notes |
| --- | --- | --- |
| OTP | Any unused TR-style phone, e.g. `555` + 7 digits | `POST auth/customer/otp/request` then verify |
| Fake OTP code | `000000` | From `OTP_FAKE_FIXED_CODE` in local env. Never logged by API |
| Email register | `qa.<timestamp>@example.com` | Password: choose a unique local password; do not reuse production passwords |
| Example register password used in Playwright | `correct-horse` | Test-only |
| Google / Apple OAuth | Unconfigured locally | Buttons must stay unavailable |

There is no seeded “shared QA customer password” in source. Create a fresh identity per session so Club welcome / first-order checks stay meaningful.

## Branches

| Name | Role | Notes |
| --- | --- | --- |
| Kadıköy Moda | Primary | Delivery + pickup; phone `+902121234567`; ETA 25–35 dk |
| Beşiktaş | Pickup-only | Delivery disabled — use for “teslimat yok” |

Do not hunt for internal UUIDs in the UI. Customer pages must not show kitchen/staff ids.

## Catalog / builder

| Item | How to find | Notes |
| --- | --- | --- |
| Live menu | `/` or `/menu` | Same catalog |
| Builder base | `/builder` | Seeded slug `ozel-burger`, badge ÖZEL |
| Typical burger search | `/search?q=burger` | Hits smash/burger names |
| Zero results | `/search?q=zzzz-no-such-burger-xyz` | Empty state |
| Culinary “smash” SKUs | e.g. Double Smash | Allowed as food names, not company identity |

## Promotions (listed, customer-safe)

| Code | Kind | Notes |
| --- | --- | --- |
| `BHCLUBWELCOME` | Fixed 50.00 TRY cart | First order only; auto-applied at checkout when eligible. **Not a wallet** |
| `BURGERLOVER` | 10% cart | Public listed deal |
| `ATESKARGO` | Delivery fee waiver | Delivery quotes only |
| Spin codes `BHSPIN…` | Issued by Ateş Çarkı | Unlisted secret codes must **not** appear on `/deals` |

Checkout quote is the price authority. `/deals` is informative.

## Club / spin / table

| Item | Value |
| --- | --- |
| Program name | BURGER HOME CLUB |
| Tiers | Kor (0), Ateş (500 lifetime earned), Master (2500) |
| Spin campaign | Ateş Çarkı (`ATES_CARKI`) — 1 play / Europe/Istanbul day |
| Table QR | `/table/bhx7k2m9q4wp` → Masa 12 / Kadıköy |
| Invalid table | `/table/not-a-real-table` |

QR does **not** log the customer in.

## Orders / payment sandbox

| Item | Notes |
| --- | --- |
| Guest checkout | Allowed |
| Operational method | `iyzico_hosted` / 3-D Secure redirect |
| Masterpass / kapıda kart | Catalogued unavailable |
| Saved cards | EXTERNAL_PROVIDER_BLOCKED — no PAN/CVV, no fake vault |
| Status page | `/payment/[checkoutId]` polls until PAID / FAILED / CANCELLED / EXPIRED |

Use the **iyzico sandbox** cards from iyzico’s current public sandbox documentation (not copied here so this file stays free of stale card numbers). If sandbox credentials are missing, treat payment success as **Blocked**, not Fail.

## Content / legal

Published Storefront content records (hikaye, KVKK, terms, privacy, distance sales, cancel, cookies, allergen, company). Company registry (MERSIS / VKN) is **unconfigured** on purpose — do not invent one.

Allergen dictionary: `/legal#alerjen-rehberi` + `/legal#alerjen-sozlugu`.

## Intentionally unavailable providers

| Provider | Expected UI |
| --- | --- |
| Google OAuth | Unavailable |
| Apple OAuth | Unavailable |
| Masterpass | Unavailable |
| iyzico card-on-file | Honest “kayıtlı kart yok / sağlayıcı kasası yok” |
| Masked courier call (ARA) | Unavailable |
| Map tiles | OSM embed (not a Google key in the client) |

## What not to use

- Production customer phones or emails
- Staff / kitchen / courier passwords
- Any PAN/CVV typed into BURGER HOME forms (there must be no such fields)
- Stitch prototype contacts (`burger@smash.co`, Smash Club, BLACK SMASH CARD)
