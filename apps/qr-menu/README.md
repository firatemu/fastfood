# QR Menü (`@fastfood/qr-menu`)

Read-only, table-facing menu surface for BURGER HOME. Published on its own local
port so it stays independent from the customer Storefront (3100), Admin (3101)
and Courier (3102).

```bash
pnpm dev:qr:watch              # http://localhost:3104
pnpm --filter @fastfood/qr-menu build
```

## What it is

A single page that lists every product with its description, price range,
portion sizes, extra options and removable ingredients. Read-only: no cart, no
checkout, no authentication.

## What it is not

It reuses the catalog API unchanged. No endpoint, schema or seed change was
required, because the QR menu needs only data the API already exposes:

| Need                     | Source                                                    |
| ------------------------ | --------------------------------------------------------- |
| Categories, names, photos| `GET /storefront/home`                                    |
| Portions, extras, remove | `GET /storefront/catalog/products/:slug` (per product)    |

Money uses the canonical `formatTryMinor` / `formatDeltaMinor` from
`@fastfood/contracts`, so prices read exactly like the Storefront.

## Design decisions

- **White background by requirement.** This inverts the dark Storefront theme
  on purpose: a QR menu is read at a table in daylight. It keeps the brand
  yellow (`#feb300`), orange (`#ff5722`) and Anton display face.
- **Independent visual system**, like the Storefront. Admin/Operations
  design tokens and chrome are blocked in `eslint.config.mjs`.
- **Continuous scroll with a sticky category rail** rather than one category
  at a time, so all 45 products are reachable without repeated tapping.
- **No invented data.** Ratings, review counts, sold counts and calories are
  empty in the database, so the menu shows none of them. Menu numbers are not
  displayed either: they restart per category and have gaps, so a customer
  reading "1" could not tell which product it refers to.
- **Print stylesheet.** A QR menu is often printed as a table tent; printing
  drops the chrome and keeps product information.

## Notes for the next developer

- The API's `API_CORS_ORIGINS` allowlist does not include this port, so the
  catalog is fetched **during server render** only. Do not move
  `getQrMenuData()` into a client component. Product `<img>` requests are not
  CORS-constrained and load fine from the API origin.
- `images.dangerouslyAllowLocalIP` is enabled **only outside production**.
  Next 16 rejects `localhost:4000` as a private address, so without it every
  product image returns 400. Keep the opt-in development-scoped.
- Port 3103 is already taken by the containerised Admin instance and is
  invisible to `ss` inside WSL. Port map is documented in the dev scripts.

## Customer platform sync

Per `.cursor/rules/45-customer-ui-sync.mdc`:

1. **Capability affected** — none of the existing customer capabilities. The QR
   menu is a new read-only surface, not a change to a storefront/mobile flow.
2. **Web surface** — `apps/storefront-web/**`: no change → `NOT_APPLICABLE`.
3. **Mobile surface** — `apps/customer-mobile/**`: no change →
   `NOT_APPLICABLE`.
4. **Shared contracts** — no change. `@fastfood/contracts` is consumed
   read-only (`formatTryMinor`, `formatDeltaMinor`).
5. **Capability registry** — unchanged. `webImpact`/`webStatus`/`mobileImpact`/
   `mobileStatus` rows do not move, because neither client changed.
6. **Verification gates** — `pnpm check:customer-platform` (passes),
   `@fastfood/qr-menu` typecheck / lint / unit / build (all pass).