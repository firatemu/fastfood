# ADR-023: Google Play testing tracks and customer account deletion

Status: Accepted
Date: 2026-10-12
Decision owners: Human owner
Authorization basis: explicit human-owner instruction in the working session of
2026-10-12 — "şimdi müşteri mobil uygulamamızı playconsole 'da yayınlayacaz" —
followed by the owner's explicit choices: internal / closed testing track,
iyzico sandbox stays, privacy policy hosted on `burger.azem.cloud`, app icon
generated from the BURGER HOME brand, and account deletion that removes personal
data immediately while keeping orders as de-identified fiscal records.

## Context

ADR-021 allowed the customer app only as a sideloaded release APK and kept every
store track prohibited. Google Play requires, before any testing track can be
rolled out to testers:

- an Android App Bundle (AAB) signed with an upload key (Play App Signing),
- a monotonically increasing `versionCode`,
- a public privacy policy URL and a Data safety declaration,
- for apps where users can create an account, an in-app **and** a web path to
  request account deletion (Play "Account deletion" policy).

Document 18 §10 asked for deletion workflows "where legally appropriate" but no
retention rule existed.

## Decision

1. The **customer app only** (`com.azemyazilim.fastfoodcustomer`) may be
   published to Google Play **internal testing and closed testing** tracks.
   Open testing and production tracks stay prohibited; courier app stays
   sideload-only. Uploading to Play Console is done by the owner; the
   repository only produces the signed AAB and the store listing material.
2. The store build targets the ADR-021 environment
   (`https://apiburger.azem.cloud/api/v1`) with iyzico **sandbox**. The store
   listing and the testing track description must state that payments are test
   payments. Live iyzico requires a new ADR.
3. Signing: the existing release keystore (outside Git) is the **upload key**;
   Google Play App Signing holds the app signing key. Version: `expo.version`
   is the user-visible version and `android.versionCode` must be incremented
   for every upload.
4. Android permissions not used by the app are blocked in `app.json`
   (`SYSTEM_ALERT_WINDOW`, legacy external storage, biometric/fingerprint,
   microphone).
5. Public pages on the storefront: `/gizlilik` (privacy policy) and
   `/hesap-silme` (account deletion instructions). Both are linked from the web
   footer and the mobile account settings.
6. **Account deletion** (`DELETE /customer/me`, body `{ "confirm": true }`):
   - refused with `ACCOUNT_HAS_ACTIVE_ORDER` while the customer has an order
     that is not delivered, cancelled, rejected, payment-failed or refunded;
   - in one transaction: profile (phone/email), password, social identities,
     preferences, verification/reset challenges, addresses, favorites,
     notifications, support conversations and newsletter subscription are
     deleted; all sessions are revoked by deletion; carts and table scans are
     detached;
   - the `users` row is kept as a de-identified tombstone
     (`status = DISABLED`, `primaryIdentifier`/`displayName` cleared) so
     orders, loyalty ledger, coupon redemptions and spin/welcome records keep
     a non-personal reference for fiscal and abuse-prevention purposes;
   - orders and checkout sessions keep amounts and items; their contact fields
     (`deliveryNote`, `buildingAccessCode`, `deliveryAddressJson`,
     `guestName`, `guestPhone`) are cleared.
     The same phone or e-mail can register again as a new account.

## Consequences

- `AGENTS.md` and ADR-021 point to this ADR for the Play testing exception.
- New error code `ACCOUNT_HAS_ACTIVE_ORDER` (document 40 §7).
- New customer capability `account-deletion` (Web + Mobile `CHANGE_REQUIRED`).
- `scripts/android-build-release.sh` gains an `aab` mode (`bundleRelease`).
- Human acceptance remains owner-only; this ADR does not open production.
