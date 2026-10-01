# Storefront header — remove burger-builder link

## Sync plan

- **Capability:** `burger-builder`; the builder feature remains available on its route and other existing entry points.
- **Web surface:** Remove the `/builder` item from `NAV_ITEMS` in `apps/storefront-web/src/lib/storefront/brand-copy.ts`; the shared `StorefrontHeader` then omits its label and link.
- **Mobile surface:** `AUTOMATICALLY_SUPPORTED`. Mobile has a native tab rather than this Web header; its builder flow remains available and is unchanged by the requested header-only scope.
- **Shared contracts:** none.
- **Registry:** no capability/status change. `burger-builder` remains `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` on both clients because the builder capability itself is retained.
- **Verification:** Prettier on the touched source, Web typecheck if the local shell is available, and browser review of `/` to confirm the header item is absent while the rest of the navigation renders.

## Implementation status

- Removed the `/builder` entry from Web `NAV_ITEMS`, so the header no longer renders its text or link. The builder route, home entry point, Mobile tab, and capability registry remain unchanged.

## Verification evidence

- **PASS:** `git diff --check` for `brand-copy.ts`.
- **PASS:** Prettier formatting for the edited `NAV_ITEMS` range.
- **PASS:** Browser review of `http://localhost:3100/`; the header contains Menü, Şubeler & Hikaye, and İndirimler & Fırsatlar, with no builder item.
- **UNVERIFIED:** Web typecheck. The WSL command session did not return output and had to be interrupted.
- A full-file Prettier check reports existing style differences in `brand-copy.ts` and the unchanged header component; no broad reformat was applied for this one-line removal.

## Header label refinement sync plan

- **Capabilities:** `branches-hikaye` and `deals-listing`; route behavior and feature availability remain unchanged.
- **Web:** Update only the corresponding labels in `apps/storefront-web/src/lib/storefront/brand-copy.ts`.
- **Mobile:** `AUTOMATICALLY_SUPPORTED`; Mobile has no matching desktop primary header, and its native tab labels are unrelated to these two destinations.
- **Shared contracts and registry:** none; capability status remains implemented on both clients.
- **Verification:** Prettier range check, `git diff --check`, and browser confirmation of the two visible header labels.

### Refinement result

- Updated the header labels to `Şubeler` and `Kampanyalar` without changing either route.
- **PASS:** Prettier check for the edited `NAV_ITEMS` range and `git diff --check`.
- **PASS:** Browser DOM review of `/` shows the requested labels in the primary header.
