# Storefront menu page

## Design plan

### Tokens and principles

- **Canvas:** `#121316`; **card:** `#1b1b1f`; **raised detail:** `#292a2d`.
- **Flame:** `#ff5722` for live/featured cues; **mustard:** `#feb300` for the principal action.
- **Typography:** Anton for the editorial menu title; Plus Jakarta Sans for branch context, category labels, product details, and controls.
- **Layout:** A concise two-column menu masthead (editorial message on the left, a real current catalog product on the right), followed immediately by the existing filter and product grid. Stack the feature art above the catalog on narrow screens.
- **Principles:** Make the menu itself the hero; prioritize categories and purchasable products over a repeated homepage carousel. Use actual API-backed product data and keep navigation, modifiers, and cart behavior intact.

### Options and review

- **Option A — Homepage repeat:** reuse the full homepage hero, reviews, combo, and builder sections. Familiar, but it pushes the menu below unrelated material and makes `/menu` indistinguishable from `/`.
- **Option B — Editorial menu masthead:** pair a short menu introduction with a featured product from the live storefront payload, then show category filters and the product grid. **Selected.** It gives this route a clear job while relying on existing API-backed product and cart components.

```text
Desktop
┌────────────────────────────────────┬─────────────────────┐
│ MENÜ                               │ Featured live item  │
│ Smash, yan lezzetler, içecekler    │ Real catalog image  │
│ [Lezzetleri keşfet] [Kampanyalar]  │ Product detail link │
├────────────────────────────────────┴─────────────────────┤
│ Tüm lezzetler · category chips                           │
│ Product cards in a responsive 3-column grid              │
└──────────────────────────────────────────────────────────┘

Mobile Web
┌────────────────────────────┐
│ Menu title and short intro │
│ Featured catalog item      │
│ Category chips (scroll)    │
│ Product cards (one column) │
└────────────────────────────┘
```

**Self-critique:** A generic cream menu or an oversized promotional carousel would fight the established charcoal/Anton storefront and repeat the current home page. The selected treatment uses one data-backed food image as the focal point and keeps the category controls immediately visible.

## Customer UI sync plan

- **Capabilities:** `catalog-categories` and `product-list`.
- **Web:** Build the `/menu` route as a product-first catalog: show the active delivery branch, visible category navigation (desktop rail/mobile horizontal list), API-backed counts, in-menu search, empty-search state, and the existing product cards/cart actions. Keep the header `Menü` item pointed to `/menu`.
- **Mobile:** `AUTOMATICALLY_SUPPORTED`; the current native Menü tab already renders API-backed categories, products, product details, and cart actions. No platform behavior changes are required.
- **Shared contracts and registry:** none; the same catalog API and implemented statuses remain in place.
- **Verification:** verify `/menu`, category data and selection, in-menu search, product cards, and header route in the browser. Run the repository customer-platform and Web/Mobile typecheck gates plus targeted format/test checks where the local environment responds. Mobile catalog remains unchanged and provides its existing category, product, details, and cart flow.

## Implementation status

- Implemented: `/menu` is now a product-first catalog with a compact page heading, active branch and delivery estimate, visible seven-category navigation with real counts, desktop category rail/mobile horizontal navigation, in-menu name/description search, no-results recovery, campaign link, and the existing customizable product cards and cart actions. Header `Menü` points to `/menu`; canonical metadata is `/menu`.
- Browser verification: route rendered 7 API categories and 45 products; `TAVUK BURGERLER` selected the active state and filtered the grid to 4 products; searching `patates` narrowed the current result set, and combining that search with the chicken-burger category returned matching products.
- Targeted `git diff --check` passed for tracked storefront sources; the new menu component has no trailing whitespace. The local storefront browser compiled and rendered the updated route. Prettier and standalone Web typecheck remain unverified because WSL commands did not respond; repository customer-platform and Mobile typecheck gates were not run.
