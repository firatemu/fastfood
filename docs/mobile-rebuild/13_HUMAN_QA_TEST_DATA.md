# 13 — Human QA test data (local/dev)

Safe synthetic data for local Docker Compose + API. **No production credentials. No real PAN/CVV. No production push/OAuth.**

API: `http://127.0.0.1:4000/api/v1`  
Android emulator: `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:4000/api/v1` + `adb reverse tcp:4000 tcp:4000` + Metro `--localhost` (WSL API is not Windows `10.0.2.2`).

## Auth

| Item | Value |
| --- | --- |
| Password account | `m4.2037@example.com` / `BurgerHomeM4x` (display may be M4Edited) |
| OTP phone | `+905559003003` |
| OTP code | Local fake provider `OTP_FAKE_FIXED_CODE` (typically `000000`) — **not printed in the app** |
| KVKK | Required on register |

## Catalog / cart

| Item | Value |
| --- | --- |
| Downtown branch | `01900000-0000-7000-8000-faaaaaaaaaaa` (Kadıköy Moda) |
| Hero/PDP product | THE DOUBLE TRUFFLE SMASH `01900000-0000-7000-8000-c10000000005` |
| Builder | `GET /storefront/catalog/builder` |
| Coupon | Only **listed** public deals from `GET /storefront/promotions`; checkout quote is authority |

## Location

| Item | Notes |
| --- | --- |
| Serviceable | Addresses near Kadıköy Moda from seed / M4 saved addresses |
| Unserviceable | Far lat/lng or out-of-area typed address → honest quote/serviceability error |
| Pickup | Same downtown branch; tracking hides courier/map |

## Engagement

| Item | Notes |
| --- | --- |
| CLUB | `GET /me/club` — Kor / welcome `BHCLUBWELCOME` if still AVAILABLE |
| Spin | One play per period; server prize; replay returns already-used |
| Table | Seed public code `bhx7k2m9q4wp` → Masa 12. Invalid: `zzznotatable99` |
| Support | First reply is SYSTEM receipt, not a live agent |
| Orders | Seeded or real sandbox orders: DELIVERED / PREPARING pickup / ON_THE_WAY |

## Payment

Sandbox iyzico hosted/3DS only. No PAN in-app. Return via `fastfoodcustomer://payment/return?checkoutId=`.

## External blockers (do not try to “make them work”)

- Google/Apple sign-in (no mobile redirect credentials)
- Native push FCM/APNs (no customer device-token API)
- Masked courier call
- Saved cards / Masterpass / kapıda kart
- Google Maps SDK
