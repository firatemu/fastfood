# Account surface — round 2: design system and full visual-language change

Work item: `account-enterprise-redesign` (round 2)
Owner-approved decisions this round: palette family retained but freed to move
within it · desktop-first (PC web, no touch) · the full Phase 6 interaction set
(onay dialog, unsaved-changes warning, toast, double-submit lock).
Still in force from round 1: dark only · `/account/table` stays a guest screen
decoupled from the customer account.

---

## 1. Why round 2 existed

Round 1 was rejected as a cosmetic repaint. Six instructions from the brief were
not implemented:

| Brief | What round 1 actually did |
| --- | --- |
| §2.1–2.3 rebuild from zero | Rebuilt inside the old card language |
| §4.1 semantic token roles | No token system; reused storefront tokens |
| §4.3 no giant cards / oversized headings | 44px Anton `headline-lg` page titles |
| §7 no unnecessary dashboard metrics | A four-tile metric strip on `/account` |
| §7 each page picks its own instrument | One repeated card-stack template |
| Phase 6 interactions | None |

This round installs a real design system and changes the visual language, not
just the markup.

---

## 2. Design system

### 2.1 Scoping — why `.ff-acct`

The account surface remaps Tailwind's `--color-*` variables inside `.ff-acct`.
Utilities inside that scope resolve to the new values; everything outside is
untouched. This was **measured, not assumed** — Tailwind v4 emits `var()`
references, so a scope-level redefinition actually paints:

```
--color-background           #121316 -> #0d0e11
--color-surface-container    #1f1f23 -> #191a1f
--font-headline-lg           Anton   -> Plus Jakarta Sans
--text-headline-lg           44px    -> 20px
--radius-xl                  .75rem  -> .5rem
```

### 2.2 The four rules the system enforces

1. **Hierarchy comes from 1px hairlines and surface steps, not filled boxes.**
   There is no card primitive in the layer at all.
2. **Mustard (`#feb300`) means one thing: the primary action of the current
   view**, plus the active-rail indicator. Never "selected", never "warning".
3. **Status has its own hues** — `ok #5ddc9a`, `warn #f0c674`, `danger #ff8f85`,
   `info #8ab4f8` — so "needs attention" can never read as "press here".
4. **Anton is withdrawn from headings.** It survives only as `.ff-figure`, at
   most one hero number per screen.

### 2.3 Primitive layer (`globals.css`, `.ff-acct` scope)

`ff-frame` · `ff-rail` · `ff-rail-item` · `ff-rail-label` · `ff-identity` ·
`ff-toolbar` · `ff-lead` · `ff-section` · `ff-rows` · `ff-row` · `ff-radio` ·
`ff-btn` (+`primary|outline|ghost|danger|sm`) · `ff-icon-btn` · `ff-tag` ·
`ff-tile` · `ff-table` · `ff-field` / `ff-input` / `ff-select` / `ff-textarea` ·
`ff-switch` · `ff-tabs` · `ff-figure` · `ff-meter` · `ff-segments` ·
`ff-inbox-row` · `ff-thread` / `ff-bubble` · `ff-dial` · `ff-empty` ·
`ff-notice` · `ff-overlay` / `ff-dialog` · `ff-toast` · `ff-scroll` ·
`ff-address-layout` · `ff-stack` / `ff-cluster` / `ff-split`

---

## 3. What each screen became

The rule: **every screen uses the instrument its content actually needs.** A
table where there are records, a ledger where there are facts, a tile grid only
for products.

| Route | Instrument | Notes |
| --- | --- | --- |
| `/account` | status ledger + form + order **table** + membership meter | No metric tiles; exactly one display figure |
| `/account/addresses` | hairline list + sticky map, real radio group | Arrow-key selection; delete asks first |
| `/account/settings` | three ledger rows + switches + KVKK record | Switches persist immediately |
| `/account/security` | segmented state bar + checklist + password form | Honest text where no session list exists |
| `/account/club` | balance figure + meter + movement **table** | Signed delta column |
| `/account/spin` | plain dial + campaign ledger | No invented countdown |
| `/account/favorites` | tile grid | The one product-forward screen |
| `/account/notifications` | inbox rows | Unread wears the info hue |
| `/account/support` | thread + composer | Real conversation history |
| `/account/table` | standalone guest screen | `.ff-acct` tokens only; no rail, no session |
| `/orders` | order **table** | Added after the owner flagged it as visually inconsistent; see §3.1 |

---

## 3.1 `/orders` — raised by the owner after delivery

The owner reported that `/orders` still looked like the old design. They were
right: the page is an account surface (it needs a session, it sits in the
account menu, it shows the customer's own records) but it had been left on the
old 12-column grid with the nav in a sidebar, so it rendered **outside**
`.ff-acct` in the storefront's warm palette while all nine sibling screens used
the account tokens. The nav itself was already the new component, which is why
the result read as "half old, half new".

- `app/(shop)/orders/page.tsx` now mounts `<AccountScreen>` (auth gate + shared
  provider), matching the nine `/account` routes.
- `orders-list-page.tsx` renders through `AccountShell`, so it inherits the
  rail, the toolbar and the account tokens.
- Orders are records with numbers and dates, so the `rounded-xl` card list
  became an `ff-table` — the same instrument as "Son siparişler" on `/account`,
  so the two screens cannot disagree about how an order looks.
- Status moved from `text-secondary-container` / `text-primary-container` (both
  accent-family) to the status vocabulary: `info`, `danger`, `warn`, `ok`.
- Reorder moved to `useSubmitLock` and reports through the shared toast, so it
  gets the double-submit lock like every other mutation.
- `/orders` is now a permanent member of the route gate (11 routes).

**Layout verification.** The dev database contains no orders, so the populated
table was measured with the `me/orders` response stubbed. That verifies
**layout only**, not the integration:

```
rows: 4   table: 862px   hOverflow: 0   allActionsOnScreen: true (4/4)
tagTones: [info, info, danger, warn]   pageerrors: 0
```

The probe caught something the screenshot alone would have hidden: the **money
column wrapped its currency symbol onto a second line** ("1845" then "₺"),
because `.ff-table .num` had no `white-space: nowrap`. Fixed.

## 3.2 The address composer — "Yeni kayıt / Adres ekle"

The owner asked for this screen to be designed from scratch. Measuring it first
showed it was not a styling problem: **the dialog was 1045px tall inside a 1000px
viewport**. The save button sat at `top: 1011`, below the fold, and the inner
scroll did not work (`scrollHeight === clientHeight`), so the form could not be
reached at all on a laptop screen.

The redesign is a **workbench** rather than a stacked form — four named groups
(`Kayıt`, `Bölge`, `Adres satırı`, `Tarif`) on the left, a sticky map on the
right with *Konumumu bul* and a live point readout (coordinate, region, status
badge). The dialog is capped to the viewport, the content scrolls in the pane,
and the footer stays fixed.

Primitive corrections found while building it:

- `.ff-row-key` needed `display: flex; flex-direction: column` — the label and
  value were inline `<span>`s and ran together ("Varsayılan adresSipariş özetinde…").
- `.ff-dialog-head` needed `justify-content: space-between`.
- The `fieldset` reset belonged in CSS, not as an inline `border: 0`, which was
  painting over the group divider.
- `.ff-point-card` needed `align-items: flex-start`; the status badge was
  stretching to full width.

**The form cannot start in a state that was never going to work.** Address
creation requires an E.164 `recipientPhone`, so a customer whose profile has no
phone is told that up front — in words, with the save button held down — instead
of filling the whole form and failing at submit.

---
Implemented in `account-ui.tsx` (provider) and `account-hooks.ts`
(`useSubmitLock`), shared by all nine authenticated routes via `AccountScreen`.

## 3.3 Password confirmation — raised by the owner after delivery

The owner asked for a password-update form with **current**, **new** and
**repeat-new** on `/account/security`. Two of the three already existed. The
form had `Mevcut şifre` and `Yeni şifre`, and the endpoint
(`POST auth/customer/password/change`) had been there all along — the third
field was simply missing on **both** clients.

A mistyped password is otherwise discovered at the *next* sign-in, where there
is no form left to correct it, so the confirmation is the last cheap place to
catch the mistake.

### Sync plan

| | |
| --- | --- |
| **Capability affected** | `account-settings` (matrix row: "Settings/security"). The `password/change` capability was already `AUTOMATICALLY_SUPPORTED / IMPLEMENTED` on both clients, so **no registry row moves** — this is form fidelity, not a new capability. |
| **Web surface** | `apps/storefront-web/src/components/storefront/account-security-page.tsx` — `CHANGE_REQUIRED`, implemented. |
| **Mobile surface** | `apps/customer-mobile/app/account/security.tsx` — `CHANGE_REQUIRED`, implemented. It had the identical two-field gap. |
| **Shared contracts** | **None.** `changeCustomerPassword(currentPassword, nextPassword)` is unchanged; the confirmation is client-side only and never leaves the device. |
| **Capability registry** | Unchanged, stated explicitly rather than skipped. |
| **Verification gates** | `check:customer-platform`, both client typechecks, scoped lint, storefront build, 11-route account gate, and a targeted end-to-end gate. |

### Behaviour

The comparison is **raw, never trimmed** — a leading or trailing space is a legal
part of a password, and trimming here would validate a string the API never
receives. The error is *added* conservatively (on blur, so an untouched form
stays quiet and a half-typed value is not scolded) but *removed* eagerly, the
instant the two agree.

---

## 3.4 Mobile / Web parity — "make the app match the site"

The owner asked for three things at once: bring the app up, remove whatever no
longer exists, and carry over whatever Web has gained. The inventory found **no
dead surfaces and two real gaps**.

### How the inventory was taken (and two tools that were wrong)

- **Wrong.** Grepping the capability ids from `customer-capability-registry.ts`
  for a matching token in each client reported **66** capabilities present in
  neither client — including `cart-crud`. A capability id is a registry string,
  not a source token; the tool was measuring the wrong thing. Discarded.
- **Wrong.** `grep "path: '...'"` with the quotes inside the shell command — the
  escaping mangled every pattern and matched **nothing at all**. A zero-match
  inventory is indistinguishable from a broken tool. Discarded.
- **Used.** A Node walk over both source trees collecting the string literals
  passed to `path:` / `path=`. It yields a checkable number (**web 64, mobile 59**
  distinct API paths) and is what the findings below rest on.

### Nothing was deleted

The request included "remove pages that no longer exist". Mobile has routes Web
does not, and every one is either a recorded capability or a screen **Web is
behind**:

| Mobile-only route | Why it stays |
| --- | --- |
| `/table/*`, `/table/scan` | `table-qr-camera` — the matrix already records Web `NOT_APPLICABLE`, mobile `IMPLEMENTED`. Web has no camera; the QR scanner is a device capability. |
| `/legal/*`, `/legal/allergens` | `legal-allergen-routes` — `IMPLEMENTED` on both clients, different route shape. |
| `/auth/reset` | Web has the API endpoint but **no page**. Deleting the mobile page would have removed the only way to reach it. |
| `/payment/return` | Provider return target. Web has no equivalent at all. |

Deleting any of these would have removed a capability and left the matrix
asserting something false.

### Gap 1 — `/address` (delivery serviceability) had no mobile screen

Web has `AddressServiceabilityPage`: enter an address or drop a pin, ask whether
a branch delivers there, get a verdict and the branch id. On mobile the only way
to learn this was to fail a checkout.

New `apps/customer-mobile/app/address.tsx` mirrors the Web screen — same heading,
same explanation sentence, `Etiket` / `Enlem` / `Boylam` fields, `Bölgeyi kontrol et`,
and an `ok`/`danger` tag carrying the resolved branch id. It reuses the existing
`checkDeliveryServiceability()` helper rather than adding a second code path.

Deliberate decision: **no `RequireCustomer` wrapper.** Web's `/address` does not
require a session. The whole point of the screen is to learn whether an address
is deliverable *before* committing to it — including on a shared device.
Requiring a customer would lock out exactly the visitor who wants to check a
neighbourhood first.

### Gap 2 — email verification was text-only on mobile

Mobile's `/account/security` stated that a verification link "is sent" and offered
no way to send one. Web already had `requestEmailVerification`. Added the same
call plus a `Doğrulama gönder` action under the email row, with its own sending
state and its own error slot.

The **phone row was left without an action on purpose**: ADR-010 suspended OTP, so
a button there would have promised something the API rejects.

### Deliberately not copied

- `fetchCourierLocation` — Web exports it and **no component calls it**. Copying
  it would have produced the same dead code in a second client. Recorded as a
  non-gap, not as missing work.
- `storefront/catalog/categories` + `/products` — Web calls two endpoints, mobile
  calls the aggregate `/storefront/home`. Same data, different mechanism.
- `storefront/newsletter` — Web has an anonymous footer subscribe; mobile has an
  account-level `newsletterOptIn` preference. Different scope, not a missing feature.

`CUSTOMER_CAPABILITY_MATRIX.md` and the capability registry are **unchanged**:
both gaps were surfaces inside capabilities already recorded as implemented on
both clients.

---
## 4. Interaction contract (phase 6)

- **Onay dialog** — irreversible delete asks first.
- **Kaydedilmemiş değişiklik uyarısı** — `beforeunload` plus a capture-phase
  link interceptor that turns in-app navigation into a question. Known limit:
  the App Router exposes no hook to intercept the browser Back button.
- **Toast** — every mutation reports; errors linger longer than successes.
- **Çift gönderim kilidi** — a ref checked synchronously inside the handler, so a
  fast double click is refused at the same tick, not one render later.

---

## 5. Files

**New (web):** `account-screen.tsx`, `account-ui.tsx`,
`lib/storefront/account-hooks.ts`
**Rewritten (web):** `account-shell.tsx`, `account-nav.tsx`, `account-page.tsx`,
`account-addresses-page.tsx`, `account-settings-page.tsx`,
`account-security-page.tsx`, `club-page.tsx`, `spin-page.tsx`,
`favorites-page.tsx`, `notifications-page.tsx`, `support-page.tsx`,
`table-page.tsx`, `address-composer.tsx`, `address-location-picker.tsx`,
`orders-list-page.tsx` + `app/(shop)/orders/page.tsx`
**Tokens:** `src/app/globals.css` (`.ff-acct` block)
**Mobile:** `theme.ts`, `components/ui.tsx`, `app/(tabs)/account.tsx`,
`app/account/{security,settings,spin,notifications}.tsx`
**New (mobile, parity round):** `app/address.tsx`
**Changed (mobile, parity round):** `app/_layout.tsx` (route registration),
`app/account/security.tsx`, `lib/auth.ts`
**Changed (web, parity round):** `src/lib/storefront/auth.ts` (`body: {}`)

Capability registry and `CUSTOMER_CAPABILITY_MATRIX.md` **unchanged** — this is
a visual and interaction change, not a capability change.

---

## 6. Verification evidence

All gates executed; exit codes captured.

| Gate | Result |
| --- | --- |
| `storefront-web` typecheck | 0 |
| `storefront-web` unit tests | 88/88 |
| `storefront-web` build | 0 (29 routes) |
| Scoped lint (21 web files) `--max-warnings=0` | 0 |
| `customer-mobile` typecheck | 0 |
| `customer-mobile` unit tests | 106/106 |
| Scoped lint, mobile parity files `app/address.tsx`, `app/_layout.tsx`,
  `app/account/security.tsx`, `lib/auth.ts` `--max-warnings=0` | 0 |
| `check:customer-platform` | 0 (13/13) |

Re-run as one combined pass **after** the parity work landed — the earlier
combined pass had been started before these files existed, so its mobile numbers
described a tree that no longer matched the repository.

**Browser gate — 11 routes at 1440×950** (the ten account routes plus
`/orders`, which entered this set when the owner raised the `/orders` regression)

```
routes                                11
hasShell / hasMain                    10/10
contrast violations                   0
accent leaks (mustard outside role)   0
console errors                        0
routes overflowing the document       0
max primary buttons on any route      1
max display figures on any route      1
```

**Phase 6 interaction gate — 12/12**

```
PASS  save disabled while clean
PASS  save enabled once dirty
PASS  toast reports the save  — tone=ok "Profil kaydedildi."
PASS  save returns to disabled
PASS  nav blocked while dirty  — dialog=1 path=/account
PASS  cancel keeps the edit  — value="Kaydedilmedi"
PASS  confirm leaves the screen  — /account/security
PASS  profile restored  — Azem Yılmaz Test
PASS  double-click fires one mutation  — PATCH x1
PASS  delete asks first  — dialog=1
PASS  cancelling keeps the address  — 3 -> 3
PASS  escape closes the dialog
```

**Scope regression** — 5 un-scoped storefront routes keep root `--color-background: #121316`
unchanged; `/account` carries `.ff-acct` and resolves `--color-surface-container: #191a1f`.

**Out-of-scope consumer regression** — routes that consume modules this work
changed but are not part of the account surface:

```
PASS  /orders    status=200  nav=true   h1="Siparişlerim"  overlay=false  errors=0
PASS  /cart      status=200  nav=false  h1="Sepetin boş"   overlay=false  errors=0
PASS  /checkout  status=200  nav=false  h1="Sepetin boş"   overlay=false  errors=0
PASS  /auth      status=200  nav=true   h1="Hesabın"       overlay=false  errors=0
```

Address composer gates, run on the live dev stack:

```
happy path   9/9 PASS  exit 0
  dialog fits the viewport  — bottom=676 vh=700
  save button on screen  — saveBottom=663
  inner pane scrolls instead of the page  — 644 > 531
  save disabled before a point is chosen
  map click is accepted before any field is filled  — 41.03600, 28.98500
  point re-picked inside the chosen province  — 37.00167, 35.32889 · Akören · Aladağ · Adana
  save enables once every required field is set
  save reports success through a toast and closes the dialog  — tone=ok "check_circle | Adres eklendi."
  address created  — 3 -> 4      probe address removed  — 4 -> 3

blocked path 6/6 PASS  exit 0
stale point  7/7 PASS  exit 0
```

**How the happy path was reached, and what was left behind.** The dev customer
has no phone, and `PATCH /me` cannot give them one — `profilePatchSchema` strips
`phone`, the service signature does not accept it, and the endpoint answers
**200 with the phone unchanged** rather than rejecting the field. For the check
only, a phone was written straight to the local dev `customer_profiles` row and
then reverted; the customer is back to `phone = null` with their original 3
addresses, and the run script restores that state even if the gate fails. The
probe address is created and deleted **through the UI**, including the
irreversible-delete confirmation, so the confirmation path is exercised too.

**Menu page gate** — run because the `set-state-in-effect` fix changes how the
category counts are produced, and a clean lint says nothing about whether the
numbers are still right:

```
/menu   categoryId=null    TÜM LEZZETLER 45 · ET BURGERLER 11 · TAVUK 4 · ÇOCUK 2
                             HOTDOG 4 · APERATİFLER 9 · SOĞUK İÇECEKLER 10
                             KAMPANYALI MENÜLER 5
         per-category sum  11+4+2+4+9+10+5 = 45  = the "all" count
        after switch       counts unchanged, still summing to 45
        back to "all"      45 again
        product cards      45 · console errors 0        exit 0
```

**Burger builder removal gate — live, on the running stack**

```
/builder   status=404   "SAYFA BULUNAMADI · Bu adres menüde yok."
/          /builder links on the page    0
           banner copy ("Oluşturucuya Başla" / "Özel Burgerini Yarat")   absent
           "Komboyu Kişiselleştir" target                                not /builder
           h1="HOME 3 SHOT BURGER"   page errors 0                        exit 0
```

**Device verification (Android 17 / API 37 emulator, `emulator-5554`, Expo Go).**
Run after the parity work, against the live stack through `adb reverse` tunnels
for Metro (8081) and the API (4000):

```
bundle loads, live menu data           products + prices + branch render from the API
/address                                TESLİMAT BÖLGESİ screen renders; fields
                                        prefilled (Kadıköy · Teslimat, 41.036 / 28.985);
                                        live verdict — "Bu konum teslimat alanındadır."
                                        with branch 01900000-…-00010E359A26
/account/security                       three password fields present
                                        (MEVCUT ŞİFRE / YENİ ŞİFRE / YENİ ŞİFRE (TEKRAR));
                                        "Doğrulama gönder" action under the email row;
                                        phone row correctly has **no** action (ADR-010)
tap "Doğrulama gönder"                 error renders **directly beneath its own button**,
                                        in Turkish — "Beklenmeyen bir hata oluştu.
                                        Tekrar deneyin." — and **not** in the shared slot
                                        under the password save button
```

The account on the emulator has no email address, so the API answers
`VALIDATION_ERROR` / "No email on this account." and the button has nothing to
send. That is the correct behaviour for this account, and it is also the case
that exposed the two client-side defects above — the wrong mapper and the wrong
slot — so it is the case worth having on screen. The request mutates nothing; no
cleanup was required.

---

## 7. Defects found and fixed

### In the round-1 work
- `<Link>` nested inside a `button` (invalid HTML) — notifications, favorites.
- Address selection unreachable by keyboard (`onClick` on `<article>`).
- An error state that could not render: if `fetchMyOrders()` rejected, `orders`
  stayed `null` and the loading gate rendered the skeleton forever.

### Regression found by the owner, after delivery
- **`/orders` crashed with `useAccountUi must be used inside
  <AccountUiProvider>`.** This work made `AccountNav` read the account context
  for its identity block, but `orders-list-page.tsx:91` mounts that nav
  directly. `/orders` is outside this surface and mounts `RequireCustomer`
  without `AccountUiProvider`, so the whole page went down over a missing
  identity block.
  *Why the gates missed it:* every account route mounts `AccountScreen`, so a
  component that wrongly requires the provider looks healthy across all ten
  account routes. The gate had to cover the routes that **consume** the changed
  modules, not only the ones that were designed.
  *Fix:* `useOptionalAccountUi()` returns `null` instead of throwing;
  `AccountNav` renders without the identity block when it is absent — which is
  exactly what `/orders` showed before this work.
  *New gate:* `gate-consumers.js` covers `/orders`, `/cart`, `/checkout`,
  `/auth` and fails on any provider/context crash or dev error overlay.

### In the new work
- **`head -c 7241` truncated `globals.css` mid-rule.** The file contains Turkish
  characters, so a byte count is not a character count; the last rule lost its
  closing brace and every stylesheet after it failed to parse. Concatenation now
  uses `cat`.
- **Windows writes never reached Turbopack.** `[System.IO.File]::WriteAllText`
  on `W:` does not fire inotify, so CSS edits were served stale for an hour
  before the pilot caught it. All deploys now stage to temp and copy inside WSL.
- **`text-overflow` on an inline `<span>`** did nothing, so a long email pushed
  the rail 103px wide. The rule now sets `display: block`.
- **Contrast 3.87:1** on the 10px eyebrow/rail-label grey, and 4.37:1 on the
  ledger surface. Both lifted to clear 4.5:1; the muted ramp is now one value.
- **Accent leaks:** the map marker and the "on" switch track both wore mustard.
  Marker → info hue, switch → ok. Measured, not eyeballed.
- **Rail background stopped at the nav's height**, leaving a seam on long pages.
  The column is now painted by a gradient on `.ff-frame`.
- Mobile: removing `mustardBloom` / `errorContainer` / `onErrorContainer` from
  `theme.ts` broke out-of-scope screens (`auth`, `orders`, modifier group).
  Restored as documented aliases.
### In the password form

- **The mismatch error survived until the next blur.** The first version only
  recomputed it on blur, so typing the *correct* confirmation left
  "Yeni şifre alanları eşleşmiyor." on screen next to a field that was already
  right. A stale error reads as "still wrong" — the customer either waited for a
  pointless blur or believed a typo the form had already resolved. The error is
  now removed the moment the two agree, from **either** field.

### Measurement corrections

- **The restore believed a failure that had not happened.**
  `POST password/change` carries `@HttpCode(200)` and the API returns its error
  **envelope with a 200 status**, so a cleanup routine that trusted
  `res.status === 200` reported success while the account was still on the
  temporary password. Cleanup must read the envelope.
- **The cleanup also presented the wrong current password.** After the change
  step the account holds the *new* password, so restoring means sending *that*
  as `currentPassword`. Sending the original failed with
  `AUTH_INVALID_CREDENTIALS` and left the account on the temporary password.
- **`password/login` is rate limited and the gate burns attempts on it**, so the
  final verification returned `429` — a throttle, not evidence about the
  password. `password/change` is `AuthGuard`-only and not throttled, so it is
  the correct instrument for "which password does this account hold".
- **The restore was verified independently after the fact** rather than trusted:
  `currentPassword=DevCustomerPass1!` → accepted, `DevCustomerPass2!` →
  `AUTH_INVALID_CREDENTIALS`. The dev account is back on its documented password.
### Measurement corrections
- The contrast probe was counting Material Symbols **ligature names** as prose.
  Icons are now excluded — it reported 2.23:1 for decorative empty-state glyphs.
- The scope regression first ran **logged out**, so `/account` redirected to
  auth and proved nothing. Re-run signed in.
- The Phase 6 gate was not idempotent: an earlier run had saved the same test
  name, so "save enabled once dirty" failed correctly-but-wrongly. The gate now
  uses a unique name and restores the original.
- The account gate measured ten routes and therefore could not see that
  `/orders` was rendering outside the design system at all. The route list is
  now eleven, and the file inventory lists `orders-list-page.tsx`.
- The consumer gate first treated `<nextjs-portal>` as an error overlay. Next.js
  dev mounts that portal on **every** page for the tools indicator, so all four
  routes "failed" while `errors=0`. The gate now reads the portal's shadow root
  and matches the actual error text.

### In the address composer

- **Map point selection never worked.** The `postMessage` listener in
  `address-location-picker.tsx` was bound to `mapState === 'loading'`; when
  `map-ready` arrived, that effect's cleanup removed the listener it had just
  installed. Split into two effects: the subscription lives for the lifetime of
  the map, the timeout is separate.
- **A stale point unlocked save.** A coordinate picked *before* a region was
  chosen survived the region change, kept the `NOKTA HAZIR` badge while the
  readout simultaneously claimed `Akören · Aladağ · Adana`, and enabled save —
  but address creation rejects a point outside the selected province. The user
  would fill the entire form and only then hit the API error. Region changes now
  invalidate the point via `setRegion()`, which returns the readout to
  `NOKTA GEREKLİ` and re-locks save until the user picks again inside the region.
- **The blocker linked to a fix that does not exist.** It pointed at
  `/account/security` labelled "Güvenlik ekranından ekle", but that screen
  cannot add a phone: `patchCustomerProfile` accepts only
  `displayName` / `locale` / `email`, and the security page itself says the
  phone is *"Kayıt ekranından tamamlanır"*. The copy now states the situation
  accurately and offers `/account/support`, which genuinely works.

### Measurement corrections

- The happy-path gate failed on `locator('.ff-dialog-foot')`: a **successful**
  save closes the dialog, so the footer is gone. The probe assumed the dialog
  stays open. The probe was wrong, not the app.
- The stale-point probe first reported PASS **for the wrong reason**. With no
  phone on the profile, `blockedReason` holds save down regardless of the point,
  so the check could never fail. It passed vacuously. Re-run with a phone
  attached, the real FAIL appeared. The gate now asserts "no blocker banner" as
  an explicit precondition before measuring anything.

### In the mobile parity work

**1. A bodyless POST carrying a JSON content-type is a 400.** All three variants
were measured against the live API before choosing one:

| request | result |
| --- | --- |
| no body, no `content-type` | 200 |
| no body, `content-type: application/json` | **400** — `Body cannot be empty when content-type is set to application/json` |
| `{}`, `content-type: application/json` | 200 |

The api-client sets the JSON content-type, so the first row was never reachable
from either client. `body: {}` applied to both. **Web carried the same latent
bug**: `requestEmailVerification` had shipped without ever being exercised, so
nothing had caught it.

**2. The wrong error mapper, leaking English to a Turkish customer.**
`authErrorMessage` — correct for sign-in — does not translate `INTERNAL_ERROR`, so
a verification failure would have rendered the raw string `API returned a payload
that did not match the shared contract.` on the phone. Switched to
`formatApiError`, which every other mobile screen already uses and which does
translate it.

**3. The error rendered three sections away from its cause.** It was written to
the shared `error` slot, which sits under the *password save* button. It now has
its own `verificationError` slot, rendered directly beneath the email row.
Confirmed on the device: the button and the correct Turkish message appear
together, and the password card carries no error.

### Measurement corrections (parity round)

**The API log does not record HTTP requests.** `/tmp/api.log` carries outbox
events only, so an absent line was read as "the request never arrived" — which is
not evidence of anything. Replaced with an on-device capture of the raw response.

**The three envelope variants were first measured with a hand-rolled `fetch`.**
Both "fix" candidates returned OK, which would have confirmed the change for the
wrong reason. Re-measured with the real `ApiClient` class, which is the class the
app actually uses.

That capture is also the evidence behind §9's third finding. On the device:

```
status=200  body={"error":{"code":"VALIDATION_ERROR","message":"No email on this account."}}
```

HTTP **200** carrying an error envelope. The behaviour was correct — that account
genuinely has no email address — but the client-side consequence is not benign;
see §9.

### The one remaining lint error, and a stale-count bug behind it

`menu-page.tsx:30` was the repository's only **error**-level lint finding —
`set-state-in-effect`, the one error that made the storefront package lint exit 1.
It was previously recorded here as pre-existing and out of scope; the owner
asked for the errors to be fixed, so it is fixed.

`menuCategories` and `allProductCount` were not independent state. When no
category filter is active, `home` **is** the unfiltered catalog and already
carries both the category list and the total count. The effect copied that
straight into state on every mount.

Fixing the lint error by suppressing it would have been the wrong move — the
copy was the symptom. The derived case is now computed during render
(`homeCarriesCategories`), and the effect keeps only the genuine fetch.

That also removed a latent staleness bug. The inline copy latched
`menuCategories`, and the very next line of the effect was
`if (menuCategories !== null) return;` — so once the page had mounted in the
unfiltered view, **the fetch could never run again for that session**. Every
subsequent category switch rendered per-category counts computed against
whatever catalog happened to be in memory at first mount, not the current one.
The counts were silently frozen.

Verified by measurement, not by the absence of a lint error:

```
/menu  (categoryId=null)   TÜM LEZZETLER 45 · ET BURGERLER 11 · TAVUK 4 · ÇOCUK 2
                            HOTDOG 4 · APERATİFLER 9 · SOĞUK İÇECEKLER 10
                            KAMPANYALI MENÜLER 5
        per-category sum   11+4+2+4+9+10+5 = 45  = the "all" count
after a category switch   counts unchanged, still summing to 45
back to "all"             45 again
product cards             45 · console errors 0
```

The sum matching the total is the part that matters: it is what a frozen count
would fail.

### Burger builder removal — raised by the owner after delivery

The owner asked whether the site has an "Özel Yarat" page at the root and, if
so, to remove it completely. Scoping the answer first changed what was removed.

**There is no such page at `/`.** The string `Özel Yarat` is **mobile-only** —
it is the tab label. The web surface is titled **"Özel Burgerini Yarat"** and
lives at `/builder`. The first search missed it because the phrase carries
"Burgerini" in the middle; a root-URL check returned zero matches and nearly
ended the task as "nothing to do". The live route answered `200` with the real
title, which is what caught the gap.

It was also **not a page** — it was a delivered capability
(`burger-builder`, `IMPLEMENTED` on both clients), and removing it touched 17
source files across five packages. The owner chose: both clients + the records,
backend kept. Recorded as **ADR-020**.

**Web:** route + `builder-page.tsx` (209 lines) + `home-builder-banner.tsx`
deleted; the banner's mount point removed from `golden-home-page.tsx`; the
combo link's `/builder` fallback repointed to `/menu`; `BuilderProduct`,
`fetchBuilderProduct` and `BUILDER_BANNER` deleted; the
`'ozel-burgerini-yarat'` Stitch data-path and its assertion deleted.

**Mobile:** `builder.tsx` (95 lines) deleted with its `Tabs.Screen` entry and
its `ITEMS` row. The tab bar rendered `builder` as a **visually raised centre
button** — a mustard→flame gradient circle pulled up by `marginTop: -20`. With
the route gone, `route.name === 'builder'` could never be true, so that branch,
its `LinearGradient` import and its styles went with it. **The mobile bottom bar
is now four flat items instead of five with a raised centre button** — a
deliberate visual consequence of the removal, recorded here so it is not later
mistaken for a regression.

**Records:** `burger-builder` now carries the registry's existing retired-capability
convention — the one `oauth-google-apple` already uses for a feature removed
from customer surfaces (`...notCustomer` → `NOT_APPLICABLE / NOT_RELEVANT`), with
a note. The entry was **kept rather than deleted** so the removal stays
auditable.

**`ingredient-removals` was corrected in the same pass.** Its matrix row read
`PDP builder removals` with the note `PDP + builder.` — both became false the
moment the builder went. They now read `PDP ingredient removals` and
`PDP only; the builder surface was removed (ADR-020).`

**`builderAvailable` was deliberately kept**, in both clients' schemas. It is a
field the `/storefront/home` payload still sends; a client schema that omits a
field its API still sends is a schema that lies about its own source. The
accepted consequence: the API keeps advertising a capability no client surfaces.

---

## 8. Pre-existing findings left in place

`menu-page.tsx:30` used to be listed here as an out-of-scope **error**. It is
fixed now — see §7.

Still open, both **warnings** only, untouched:
`catalog.ts:5` (type-import), `branches.tsx:99` (non-null assertion). Neither
affects the exit code: the storefront package now lints clean at error level
(`eslint --quiet .` → 0).

---

## 9. Needs an owner decision — not fixed here

**A customer with no phone cannot add an address, and cannot fix that either.**
Address creation requires an E.164 `recipientPhone`. There is no web path that
sets a profile phone: `PATCH /me` accepts only `displayName` / `locale` /
`email`, and `/account/security` only *displays* the phone state. Phone numbers
are set during registration.

This work makes the situation honest — the composer says so before the user
types anything and offers support — but it does not **resolve** it. Resolving it
means either letting `PATCH /me` accept `phone` (an API contract change: ADR +
owner decision, with verification semantics attached) or giving
`/account/security` a separate verified-phone flow. Both are outside this task.

Related, and probably worth deciding at the same time: `PATCH /me` answers
`200` when handed a field it does not accept. Zod strips it silently, so a
client integrating against this endpoint cannot tell "applied" from "ignored".

**The shared API client cannot read an error envelope that arrives with HTTP
200.** `packages/api-client/src/client.ts` decides success with `response.ok`.
When the API answers `200` with an `error` envelope, `response.ok` is `true`, the
client takes the success branch, the success schema does not match the error
payload, and the failure surfaces as `API returned a payload that did not match
the shared contract.` — an internal message shown to a customer. Reproduced on
the device during the parity work, so it is reachable in practice, not
theoretical.

**Not changed here**, for the same reason as the two items above: `client.ts` is
shared by every consumer, so changing its error semantics is an API contract
decision requiring an ADR and an owner. The per-client mapper is what was used
instead (§7).

---

## 10. Not verified

- The mobile password-mismatch message could not be **photographed** on the
  device. `adb input tap` does not reliably move focus between three consecutive
  `TextInput`s — the typed value landed in the first field. The logic is the same
  and is covered end to end by the 9/9 Web gate; on mobile, that three fields
  render is evidenced by a screenshot, not that the mismatch string appears.
- The mobile work was exercised on an Android 17 (API 37) emulator running
  **Expo Go**, not on a physical device and not in a dev/release build. `/deals`
  cannot load there at all: it imports `expo-clipboard`, which is absent from
  Expo Go's native module set. That is an environment limit, not a code defect —
  a real build needs `expo run:android`.
- Browser Back during an unsaved edit is not guarded (App Router limitation).
- No light-mode pass: explicitly dropped by the owner.