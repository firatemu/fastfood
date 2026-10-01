# 15 — BURGER HOME Storefront human QA checklist

For a human tester on **local/dev only** (`http://localhost:3100/`).

Not an AI runbook. Not production. Do not mark `HUMAN_ACCEPTED` in this file.

Pass/Fail is yours. Use test data from `16_HUMAN_QA_TEST_DATA.md`.

Mark each row: **Pass** / **Fail** / **Blocked** (external provider) / **N/A**.

---

## How to use

1. Start local API + Storefront (see test-data guide).
2. Use an incognito window for guest flows.
3. Use a second window for authenticated flows.
4. Record notes when copy, layout, or recovery feels wrong — even if the action “works”.

Primary brand must remain **BURGER HOME**. Loyalty must remain **BURGER HOME CLUB**.

---

## Guest

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-G01 | `/` | Logged out | Open Home | BURGER HOME wordmark, live catalog, no Smash & Co. company identity |  |  |
| QA-G02 | `/` | Logged out | Header person icon | Goes to `/auth`, not `/account` |  |  |
| QA-G03 | `/` | Logged out | Add a product, open cart | Guest cart has the line; header badge matches |  |  |
| QA-G04 | `/auth` → `/` | Guest cart with items | Register or OTP login | Cart survives merge; header switches to account avatar |  |  |

## Auth

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-A01 | `/auth` | Logged out | Request OTP with a new TR phone; enter `000000` | Session created; lands in Storefront; code never shown in UI/logs |  |  |
| QA-A02 | `/auth` | Logged out | Register email + password | Lands on `/account`; password not echoed |  |  |
| QA-A03 | `/auth` | Logged out | Wrong OTP / wrong password | Clear Turkish error; no stack trace |  |  |
| QA-A04 | `/account` | Logged in | Logout | Returns to Home as guest; back button does not show private account data |  |  |
| QA-A05 | `/account` | Logged out | Open `/account` directly | Redirects to `/auth?next=/account` |  |  |
| QA-A06 | `/auth` | No Google/Apple env | Look at OAuth buttons | Unavailable / honest blocked — no fake success |  |  |

## Home

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-H01 | `/` | Catalog seeded | Browse categories | Cards, mustard/flame CTAs, no duplicate header |  |  |
| QA-H02 | `/` | Desktop ≥1024 | Click Menü / Builder / Şubeler / Fırsatlar | Each lands on the live page; Menü stays on Home catalog |  |  |
| QA-H03 | `/menu` | Any | Open `/menu` | Same live catalog as `/`; URL can stay `/menu` |  |  |
| QA-H04 | `/` | Mobile 390 | Use logo, search icon, Izgarada pip, cart, account | All reachable without a hamburger |  |  |
| QA-H05 | `/` | Keyboard | Tab through header | Visible focus; skip link “İçeriğe geç” works |  |  |

## Search

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-S01 | `/search` | Empty query | Open page | Browseable catalog, not a blank dead end |  |  |
| QA-S02 | Header search | Desktop | Type `burger` Enter (not on Home) | `/search?q=burger`; input keeps the query |  |  |
| QA-S03 | `/search?q=zzzz-no-such-burger-xyz` | Seeded catalog | Open | “0 sonuç” empty state + Menüye dön |  |  |
| QA-S04 | Search results | A result card | Click product | Real PDP; branch availability still applies |  |  |

## PDP

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-P01 | `/products/[id]` | Available burger | Required radios, extras, removals, qty | Price preview updates; invalid combo cannot add |  |  |
| QA-P02 | PDP | Incomplete required group | Leave a required group empty if possible | CTA disabled; “Seçmen gerekenler” lists the group |  |  |
| QA-P03 | PDP | After add | Success + Sepete git / alışverişe devam | Cart count updates; no duplicate line on second identical click until config changes |  |  |
| QA-P04 | PDP | Unavailable product | Open if present | Honest unavailable; cannot add |  |  |

## Builder

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-B01 | `/builder` | Builder product seeded | Configure required + extras + removals | Looks like PDP customization, not a foreign widget |  |  |
| QA-B02 | `/builder` | Required unmet | Disable a required radio if UI allows | CTA disabled; remaining groups named |  |  |
| QA-B03 | `/builder` | Valid config | Add to cart → `/cart` | Normal cart line with modifiers; not a second cart |  |  |
| QA-B04 | Builder preview | Any selection | Read preview chips | Human names (not `[object Object]`) |  |  |

## Cart

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-C01 | `/cart` | Empty | Open | Empty state + menü CTA |  |  |
| QA-C02 | `/cart` | One line | Change qty, remove | Totals and header badge stay in sync |  |  |
| QA-C03 | `/cart` | Same product twice (same config) | Add twice from Home | Quantity increases or two legal lines — no ghost duplicate UI |  |  |
| QA-C04 | `/cart` | Coupon `BURGERLOVER` | Apply / remove | Quote/cart shows discount or honest reject |  |  |

## Checkout

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-X01 | `/checkout` | Cart with items | Delivery vs pickup | Pickup shows 10% rule from server; delivery needs address |  |  |
| QA-X02 | `/checkout` | Delivery | Address / serviceability change | Quote refreshes; stale total does not stick |  |  |
| QA-X03 | `/checkout` | Guest | Guest name/phone | Can continue without account |  |  |
| QA-X04 | `/checkout` | Loyalty points | Toggle redeem | Amount comes from quote, not the browser |  |  |
| QA-X05 | `/checkout` | First-order customer | No coupon typed | Welcome `BHCLUBWELCOME` may auto-apply |  |  |
| QA-X06 | `/checkout` | Masterpass / kapıda | Look at methods | Honest unavailable — not clickable fake pay |  |  |
| QA-X07 | `/address` | Any | Run serviceability | Probe only; does not replace Account address book |  |  |

## Payment

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-Y01 | `/payment/[id]` | Quote initialized | Pending / redirect | Clear “ödeme bekleniyor”; link to hosted page if present |  |  |
| QA-Y02 | Payment | Sandbox success | Complete iyzico | Confirmation — customer never wonders if order went through |  |  |
| QA-Y03 | Payment | Fail / cancel / expire | Trigger or wait | Status copy + Checkout’a dön; no fake PAID |  |  |
| QA-Y04 | Payment | Tab hidden | Leave tab in background | Polling pauses; no runaway spinner |  |  |

## Confirmation / tracking

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-T01 | `/orders/[id]/confirmation` | Paid order | Open | Order id, totals, next-step to tracking |  |  |
| QA-T02 | `/orders/[id]` | Preparing / courier | Watch stepper | Culinary labels, not kitchen jargon |  |  |
| QA-T03 | Tracking | Delivery with courier | Map | OSM embed or honest no-location; stale location copy if delayed |  |  |
| QA-T04 | Tracking | Pickup | Open | No courier map; pickup-ready language |  |  |
| QA-T05 | Tracking | Cancelled / rejected / failed | Open | Negative state + support CTA |  |  |
| QA-T06 | Tracking | Other customer’s id | Open while logged in as A | Not found / no access — no leak |  |  |

## Account

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-N01 | `/account` | Logged in | Profile save | Name/email persist; success feedback |  |  |
| QA-N02 | Account nav | Logged in | Walk every item | No duplicate titles; back paths make sense |  |  |
| QA-N03 | `/account` | Saved cards section | Read copy | Honest “provider vault yok”; no BLACK SMASH CARD |  |  |

## Addresses / favorites / reorder

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-R01 | `/account/addresses` | Logged in | Add / edit / delete | Labels, validation, loading on submit |  |  |
| QA-R02 | `/account/favorites` | Empty then add from PDP | Toggle heart | List updates; unavailable favorite is honest |  |  |
| QA-R03 | `/orders` | Past order | Reorder | Cart restored or partial unavailable listed |  |  |

## Club / spin / notifications / support

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-L01 | `/account/club` | New customer | Open | Kor (or current) tier, points, welcome as promotion not wallet |  |  |
| QA-L02 | `/account/spin` | Eligible | Spin | Result text readable; animation optional; cannot pick prize |  |  |
| QA-L03 | `/account/spin` | `prefers-reduced-motion` | Spin | Result still in text |  |  |
| QA-L04 | `/account/notifications` | Unread | Mark one / mark all | Unread badge on header updates |  |  |
| QA-L05 | `/account/support` | Logged in | Send a message | SYSTEM receipt, not a fake human agent |  |  |

## Table QR

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-Q01 | `/table/bhx7k2m9q4wp` | Guest | Open | Banner under header; still guest; menu continues |  |  |
| QA-Q02 | `/table/not-a-real-table` | Any | Open | Invalid recovery + Ana sayfa |  |  |
| QA-Q03 | Banner | Context set | Kapat | Banner gone; cart unchanged |  |  |

## Branches / deals / legal

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-D01 | `/branches` | Two+ branches | Open | Kadıköy delivery+pickup; Beşiktaş pickup-only; hikaye copy |  |  |
| QA-D02 | `/deals` | Listed promos | Open | Customer titles only; checkout remains authority |  |  |
| QA-D03 | `/legal` | Content seeded | Open hashes | KVKK, terms, allergen guide, company — no invented MERSIS |  |  |

## Responsive / mobile

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-V01 | Representative pages | 375 / 390 | Home, Search, PDP, Builder, Cart, Checkout, Auth, Account, Club, Orders, Tracking, Deals, Branches, Legal, Support | No horizontal overflow; sticky CTAs usable; no hamburger |  |  |
| QA-V02 | Same | 768 / 1024 | Same pages | Search appears ≥768; full nav ≥1024 |  |  |
| QA-V03 | Same | 1440 / 1920 | Same pages | Content capped ~1280; location chip on xl |  |  |

## Error recovery

| Test ID | Route / start | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| QA-E01 | `/` | Stop API | Reload Home | Menü yüklenemedi + Tekrar dene + Ana sayfa; no stack |  |  |
| QA-E02 | `/this-route-does-not-exist` | Any | Open | Sayfa bulunamadı |  |  |
| QA-E03 | Invalid coupon | Checkout | Apply junk code | Business message, cart intact |  |  |
