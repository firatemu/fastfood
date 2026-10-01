# Admin Panel — Screen & Workflow Map

> Derived from current backend + `apps/admin-web` routes.  
> Visual design is out of scope; this is information architecture for Google Stitch handoff.

---

## 1. Proposed Information Architecture

```text
Ops Control Plane
├── Dashboard
├── Operations
│   ├── Orders (list + detail)
│   ├── Kitchen board
│   └── Couriers & deliveries
├── Catalog
│   ├── Products
│   ├── Categories
│   ├── Modifiers
│   ├── Allergens
│   └── Media (product media attach)
├── Branches
│   ├── Branch list / edit
│   └── Service areas (+ product availability)
├── Customers
│   ├── Customer list / detail
│   └── Loyalty lookup (balance via customer)
├── Marketing
│   └── Promotions
├── Finance
│   ├── Payments (list + detail)
│   └── Refunds (create / lookup by id)
├── Reports
│   ├── Sales
│   ├── Branches
│   ├── Products
│   └── Couriers
├── Access
│   ├── Users
│   ├── Roles & permissions
│   └── Audit log
└── Settings
    └── Business settings
```

**Not justified by Admin APIs today:** Inventory, Dining tables admin, Support inbox, Spin campaigns, Newsletter, Storefront CMS, Live map.

---

## 2. Main Navigation

Aligned with `apps/admin-web/src/lib/admin-nav.ts` + backend permissions:

| Nav label (TR as today) | Path | Permission gate |
| --- | --- | --- |
| Dashboard | `/` | (any authenticated staff with shell) |
| Siparişler | `/orders` | `orders.read` |
| Mutfak | `/kitchen` | `orders.read` |
| Kuryeler | `/couriers` | `couriers.read` |
| Ürünler / Kategoriler / Modifier / Alerjen / Medya | `/catalog/*` | `catalog.products.read` (+ media write for media) |
| Şubeler / Servis alanları | `/branches*` | `branches.read` |
| Müşteriler | `/customers` | `customers.read` |
| Sadakat | `/loyalty` | `loyalty.read` |
| Promosyonlar | `/promotions` | `promotions.read` |
| Ödemeler / İadeler | `/payments`, `/refunds` | `payments.read` / `payments.refund` |
| Raporlar | `/reports` | `reports.read` |
| Kullanıcılar / Roller | `/users`, `/roles` | `users.read` |
| Denetim | `/audit` | `audit.read` |
| Ayarlar | `/settings` | `settings.read` |

Hide items when permission missing; `/access-denied` for blocked deep links.

---

## 3. Screen Inventory

**Count of Admin-relevant screens justified by backend: 28**
(login + access-denied + production OpsShell routes; lab surfaces excluded)

| # | Screen | Purpose | Primary user |
| --- | --- | --- | --- |
| 1 | Login | Staff auth + MFA | All staff |
| 2 | Access denied | Permission failure | All |
| 3 | Dashboard | Ops KPIs from composed APIs | HQ / managers |
| 4 | Orders list | Browse/filter orders | Ops |
| 5 | Order detail | Status, money, items, transitions, reassign | Ops |
| 6 | Kitchen board | Active kitchen statuses | Kitchen / branch |
| 7 | Couriers list | Courier profiles | Dispatch |
| 8 | Delivery assign / QR | Assign + mint claim token | Dispatch |
| 9 | Products list | Catalog products | Catalog |
| 10 | Product create/edit | Product form | Catalog |
| 11 | Categories list/edit | Category tree | Catalog |
| 12 | Modifier groups | Groups + modifiers create | Catalog |
| 13 | Allergens | Allergen master | Catalog |
| 14 | Product media | Attach URL media | Catalog |
| 15 | Branches list | Branch ops flags & fees | Branch ops |
| 16 | Branch edit | Hours, accepting orders, fees | Branch ops |
| 17 | Service areas | Delivery geography | Branch ops |
| 18 | Branch product availability | Temporary sold-out | Branch ops |
| 19 | Customers list | Customer directory | Support / HQ |
| 20 | Customer detail | Profile + points balance | Support |
| 21 | Loyalty lookup | Find customer points | Support |
| 22 | Promotions list | Campaign codes | Marketing |
| 23 | Promotion create/edit | Kind, window, limits | Marketing |
| 24 | Payments list | Payment attempts | Finance |
| 25 | Payment detail | Attempt + refund action | Finance |
| 26 | Refund create / by-id | Refund workflow | Finance |
| 27 | Reports hub | Four report views | Finance / HQ |
| 28 | Users / Roles / Audit / Settings | Access & config | HQ |

---

## 4. Screen-to-API Mapping

| Screen | Primary APIs |
| --- | --- |
| Login | `POST /auth/staff/login`, `POST /auth/staff/mfa/verify` |
| Dashboard | Compose `GET /admin/orders`, `GET /admin/reports/sales`, `GET /admin/kitchen` |
| Orders list | `GET /admin/orders?branchId=` |
| Order detail | `GET /admin/orders/:id`, `POST .../transitions`, `POST .../reassign-branch` |
| Kitchen | `GET /admin/kitchen` |
| Couriers | `GET/POST /admin/couriers`, delivery assign/reassign/qr-token |
| Catalog products | `GET/POST/PATCH /admin/products` |
| Categories | `GET/POST/PATCH /admin/categories` |
| Modifiers | `GET/POST/PATCH /admin/modifier-groups`; nested modifier create/update; product-group attach/detach |
| Allergens | `GET/POST /admin/allergens`, `PATCH/DELETE /admin/allergens/:id`, product link/unlink |
| Media | `POST /admin/products/:id/media` |
| Branches | `GET/POST/PATCH /admin/branches`, hours PUT, service-areas, product-availability |
| Customers | `GET /admin/customers`, `GET /admin/customers/:userId` |
| Promotions | `GET/POST/PATCH /admin/promotions` |
| Payments | `GET /admin/payments`, `GET /admin/payments/:id` |
| Refunds | `POST /admin/payments/:paymentId/refunds`, `GET /admin/refunds/:id` |
| Reports | `GET /admin/reports/{sales\|branches\|products\|couriers}` |
| Users/Roles | `GET /admin/users\|roles\|permissions`, `POST /admin/users/:id/roles` |
| Audit | `GET /admin/audit` |
| Settings | `GET /admin/settings`, `PATCH /admin/settings/:key` |

---

## 5. Screen-to-Permission Mapping

| Screen group | Read | Write / action |
| --- | --- | --- |
| Orders / Kitchen | `orders.read` | `orders.update_status`, `orders.reassign_branch` |
| Catalog | `catalog.products.read` | `catalog.products.write`, `catalog.media.write` (`catalog.prices.write` unused distinctly in product PATCH) |
| Branches | `branches.read` | `branches.write`, `branches.service_areas.write` |
| Customers / Loyalty UI | `customers.read` / `loyalty.read` | — (no customer write admin) |
| Promotions | `promotions.read` | `promotions.write` |
| Payments | `payments.read` | `payments.refund` |
| Couriers | `couriers.read` | `couriers.write`, `couriers.assign` |
| Reports | `reports.read` | — |
| Users | `users.read` | `users.write` |
| Audit | `audit.read` | — |
| Settings | `settings.read` | `settings.write` |

---

## 6. Tables and Lists

### Orders

- **Columns:** Order id (short), status badge, fulfillment mode, branch, final payable (formatted TRY), createdAt, scheduledFor?
- **Filters:** branchId (API); status/search client-side today
- **Row actions:** open detail; (detail) transition / reassign
- **Pagination:** UNKNOWN if server cursor/page — admin-web currently loads list; treat as limited list unless API adds pagination

### Kitchen

- Cards or dense rows by status columns: Assigned / Accepted / Preparing / Ready
- Action: transition to next kitchen status
- Refresh control (no websocket)

### Products

- Columns: name, slug, category, basePrice, isActive, displayOrder
- Filters: categoryId
- Actions: edit, toggle active, attach media

### Customers

- Columns: displayName, phone, account status, points (detail)
- Actions: open detail only

### Payments

- Columns: id, status, amountMinor, currency, provider, createdAt
- Actions: open detail → refund

### Promotions

- Columns: code, name, kind, isActive, validFrom/To, usage
- Actions: create/edit

### Couriers

- Columns: name/phone/active, assignment counts (if composed)
- Actions: create; assign delivery

### Users

- Columns: identity, roles
- Actions: assign role

### Audit

- Columns: actor, action, entity, timestamp, metadata summary

### Reports

- Tabular daily/branch/product/courier aggregates; chart optional via composition

---

## 7. Detail Pages

### Order detail (critical)

- Header: status, mode, times, branch
- Money breakdown (all minor fields)
- Line items + modifiers/removals
- Prefs / address JSON / notes
- Allowed next statuses (from FSM) as primary actions
- Cancel/reject with confirmation
- Reassign branch (sensitive)
- Link to payment/refund if known

### Payment detail

- Attempt fields, provider ids
- Refund form: amountMinor, reason → confirm

### Customer detail

- Profile + phone verification + pointsBalance
- No edit admin API — read-only

### Branch detail / edit

- Accepting orders toggle, fees, min order, hours editor, service areas link

---

## 8. Forms

| Form | Required fields (API) | Notes |
| --- | --- | --- |
| Product create | categoryId, slug, name, basePriceMinor | Optional description, isActive, displayOrder |
| Product update | any of name/description/basePrice/isActive/displayOrder | |
| Category | name, slug | parentId?, isActive, displayOrder |
| Modifier group | name | min/max select, required, exclusive |
| Allergen | code, name | |
| Product media | url | altText, displayOrder |
| Branch create | code, name, addressLine | optional geo/phone/flags/fees |
| Branch hours | weekday + open/close times | PUT replace set |
| Service area | geometry/rules payload per API | |
| Product availability | available boolean (+ reason?) | |
| Promotion | name, kind + kind-specific discount fields, validity | code optional; branchIdsJson |
| Courier create | profile fields per DTO | |
| Delivery create/assign | orderId, courierId | QR mint |
| Refund | amountMinor | reason optional |
| Role assign | roleId | |
| Setting | value for key | |

**Complex forms → sections/tabs:** Product (basics / pricing / media / allergens), Branch (profile / hours / areas / availability), Promotion (offer / targeting / limits / storefront copy).

---

## 9. Modals / Drawers / Confirmations

| Pattern | Use |
| --- | --- |
| Confirm dialog | Order cancel/reject; refund; settings write; role assign |
| Drawer | Quick transition on kitchen; attach media |
| Modal form | Create category/allergen/courier; mint QR (show token once) |
| Toast | Transition success/illegal transition error |

---

## 10. Multi-Step Workflows

1. **Order ops:** list → detail → choose allowed transition → confirm → refresh events  
2. **Dispatch:** create delivery → assign courier → mint QR → courier claims (mobile, out of Admin)  
3. **Refund:** payment list → detail → amount → confirm → poll/get refund by id  
4. **Catalog publish:** create product → attach media URL → set active → optional branch sold-out  
5. **Staff access:** list users → assign role → verify permissions in shell  

No multi-step “wizard” required by API, but refund + dispatch benefit from guided steps.

---

## 11. Dashboard

### KPI cards (composition)

| KPI | Source |
| --- | --- |
| Today order count / net revenue | `reports/sales` (today row) or filter client |
| Active kitchen queue | `admin/kitchen` length |
| Open orders (non-terminal) | `admin/orders` filtered client-side |
| Refunded today | sales report `refundedMinor` |

### Charts (composition)

- Orders/revenue by day from sales report
- Gross by branch from branches report
- Top products from products report

### Operational widgets

- Recent orders (orders list)
- Couriers active vs delivered (couriers report)
- **Do not** invent live courier map or inventory low-stock

---

## 12. Responsive Considerations

| Area | Requirement |
| --- | --- |
| Orders / payments tables | Horizontal scroll or column priority on mobile |
| Kitchen board | Stack columns vertically; large status buttons |
| Product / promotion forms | Single column; sticky save bar |
| Dashboard charts | Full-width cards; simplify to sparklines on small |
| Filter panels | Collapse into bottom sheet on mobile |
| Nav | Collapsible drawer; permission-filtered |
| Order detail | Sticky status action bar |

Primary Ops use case remains **desktop**; kitchen may use tablet.

---

## 13. Empty / Loading / Error States

| State | Guidance |
| --- | --- |
| Empty list | Explain + CTA when write permission (e.g. create product) |
| Loading | Skeleton tables; disable transition buttons |
| Illegal transition | Surface API error; do not show invalid next statuses |
| 403 | Access denied page |
| Auth expired | Return to login |
| Refund over amount | Inline validation + API error |

---

## 14. Critical Operational Workflows

### A. Kitchen pace

Poll/refresh kitchen → accept → preparing → ready → handoff to courier assignment.

### B. Problem order

Detail → reject or cancel (if allowed) → optional refund from payment → audit trail.

### C. Branch surge

Toggle `isAcceptingOrders` / sold-out product availability → monitor kitchen depth.

### D. Promo launch

Create promotion with window + kind → activate → verify storefront (out of Admin) → monitor redemptions **UNKNOWN** (no admin redemption analytics endpoint confirmed).

### E. Privileged change

Settings or role assign → confirmation → audit list verification.
