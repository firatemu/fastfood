# Admin Panel — CRUD & Interaction Specification

> Authority: current repository controllers, Zod DTOs, services, Prisma schema, order/delivery FSMs.  
> Analysis date: 2026-09-25 (staff-user lifecycle verified against ADR-014)
> Classifications: `SUPPORTED` | `SUPPORTED_VIA_COMPOSITION` | `PARTIALLY_SUPPORTED` | `NOT_SUPPORTED` | `UNKNOWN`  
> Updated alongside ADR-014 and the staff-user lifecycle implementation.

---

## 1. Master CRUD Matrix

| Domain | Entity | List | Detail | Create | Update | Delete | Activate / Deactivate | Other Actions | Permission(s) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Orders | Order | YES¹ | YES | NO² | NO³ | NO | N/A | Transition; reassign branch | `orders.read` / `orders.update_status` / `orders.reassign_branch` |
| Orders | OrderItem | via detail | via detail | NO | NO | NO | NO | — | `orders.read` |
| Orders | OrderEvent | via detail | via detail | NO⁴ | NO | NO | NO | Timeline rows auto-created on transition | `orders.read` |
| Catalog | Category | YES | NO⁵ | YES | YES | NO | YES (`isActive`) | Filter `parentId` | `catalog.products.read` / `.write` |
| Catalog | Product | YES | YES | YES | YES⁶ | NO | YES (`isActive`) | Attach media URL + file upload | read/write; media: `catalog.media.write` |
| Catalog | ProductVariant | NO | via product storefront only | NO | NO | NO | NO | Schema exists; **no Admin API** | — |
| Catalog | ModifierGroup | YES | YES (nested options/products) | YES | YES | Soft deactivate | YES (`isActive`) | Selection bounds; `includeInactive=true` for maintenance | `catalog.products.read` / `.write` |
| Catalog | Modifier | nested in group | nested in group | YES | YES | Soft deactivate | YES (`isActive`) | Prices use integer minor-unit strings | `catalog.products.read` / `.write` |
| Catalog | Product↔ModifierGroup | nested in group | nested in group | Attach | YES (`displayOrder`) | Detach | — | Attach/detach by product ID; order maintained per product | `catalog.products.read` / `.write` |
| Catalog | Allergen | YES | NO | YES | NO | NO | NO | — | `catalog.products.read` / `.write` |
| Catalog | ProductAllergen | NO | NO | NO | NO | NO | NO | **no Admin API** | — |
| Catalog | ProductMedia | YES | NO | YES (attach + upload) | NO | NO | NO | MinIO file upload + URL | `catalog.media.write` |
| Catalog | IngredientRemoval | NO | NO | NO | NO | NO | NO | Schema only | — |
| Branch | Branch | YES | YES | YES | YES⁸ | NO | PARTIAL⁹ | Accepting orders toggle | `branches.read` / `.write` |
| Branch | OperatingHours | YES | — | REPLACE (PUT) | REPLACE (PUT) | NO | per-day `isClosed` | Full week replace | `branches.read` / `.write` |
| Branch | ServiceArea | YES | NO | YES | NO | NO | NO | Create polygon; no patch/delete | `branches.read` / `branches.service_areas.write` |
| Branch | BranchProductAvailability | NO list | NO | UPSERT | UPSERT | NO | `isAvailable` | Mark sold-out / restore | `branches.service_areas.write` |
| Customers | Customer | YES¹⁰ | YES | NO | NO | NO | NO | Read-only profile | `customers.read` |
| Loyalty | Points balance | via customer | via customer | NO | NO | NO | NO | Lookup composition | `customers.read` (+ `loyalty.read` UI gate) |
| Loyalty | Settings | via BusinessSetting | — | NO | if mutable key | NO | — | `loyalty.points_per_try_minor` example | `settings.*` not `loyalty.settings.write` wired |
| Marketing | Promotion | YES | YES | YES | PARTIAL¹¹ | NO | YES (`isActive` only) | Kind-specific create fields | `promotions.read` / `.write` |
| Finance | PaymentAttempt | YES | YES | NO | NO | NO | NO | Read-only | `payments.read` |
| Finance | Refund | NO list | YES by id | YES | NO | NO | NO | Create under payment | `payments.refund` / `.read` |
| Dispatch | CourierProfile | YES | NO | YES | NO | NO | NO | Register courier | `couriers.read` / `.write` |
| Dispatch | Delivery | NO admin list | NO admin get | YES | NO | NO | N/A | Assign; reassign; mint QR | `couriers.assign` |
| Access | Staff User | YES (assigned branch scope; max 50) | via list | YES (administrator-created active account + password) | YES (display name; email after verification; admin password reset) | soft disable only | YES (reversible) | Role assign/revoke; branch scope; reset password | `users.read` / `.write` |
| Access | Role | YES | NO | NO | NO | NO | NO | Read catalog | `users.read` |
| Access | Permission | YES | NO | NO | NO | NO | NO | Read catalog | `users.read` |
| System | AuditLog | YES | NO | NO | NO | NO | NO | Read-only | `audit.read` |
| System | BusinessSetting | YES | by key | NO | YES if `mutable` | NO | — | Patch `valueJson` | `settings.read` / `.write` |
| Reports | Sales/Branch/Product/Courier | YES | — | NO | NO | NO | NO | Read aggregates | `reports.read` |

**Footnotes**

1. `GET /admin/orders?branchId=` — **branchId required** (server).  
2. Orders created via customer checkout / `POST /orders` — not Admin create UX.  
3. No free-form PATCH; status only via transitions.  
4. Events created by system on transition.  
5. No `GET /admin/categories/:id`; use list.  
6. Patchable: `name`, `description`, `basePriceMinor`, `displayOrder`, `isActive` — **not** `slug` / `categoryId`.  
7. Media returned on product detail if service includes it; attach is separate POST. List of all media alone = NOT_SUPPORTED.  
8. Patchable: `name`, `addressLine`, `phone`, `isAcceptingOrders`, `minOrderMinor`, `deliveryFeeMinor` — **not** code, geo, pickup/delivery flags, ETA, image, story, `isActive`.  
9. `isActive` on Branch exists in schema but **not** in Admin PATCH DTO → deactivate branch = NOT_SUPPORTED via Admin. Use `isAcceptingOrders` instead.  
10. List `limit` default 50; no query filters in controller.  
11. PATCH body is **only** `{ isActive: boolean }` — cannot edit code/amounts/dates after create via Admin API.

### Staff User lifecycle (ADR-014, updated by ADR-016)

| Action | Status | Contract |
| --- | --- | --- |
| List | SUPPORTED | `GET /admin/users`, maximum 50, filtered to staff with at least one branch in the caller's assigned scope |
| Create account | SUPPORTED | `POST /admin/users`; email, display name, role IDs, one branch when not Super Admin, permission codes, and an administrator-set password; creates an active account |
| Password reset | SUPPORTED | `PATCH /admin/users/:userId/password`; authorized admin sets a 12–256 character password, active sessions are revoked, and the change is audited |
| Edit display name | SUPPORTED | `PATCH /admin/users/:userId`; no direct email mutation |
| Change email | SUPPORTED | `POST /admin/users/:userId/email-change`, then `POST /auth/staff/email/confirm`; old login identifier remains until verification |
| Disable / restore | SUPPORTED | `PATCH /admin/users/:userId/status`; disable revokes active sessions; restore requires a configured password |
| Role assignment | SUPPORTED | `POST /admin/users/:userId/roles`; actor role hierarchy is checked; self role removal is rejected |
| Role revocation | SUPPORTED | `DELETE /admin/users/:userId/roles/:roleId`; the last active Super Admin cannot be removed |
| Branch scope | SUPPORTED | `PATCH /admin/users/:userId/branches`; only branches assigned to the actor may be changed; self-scope changes are rejected |

New accounts are created directly and no invitation or user-selected password
setup link is issued. Administrators must share initial/reset passwords through
a secure channel; plaintext passwords and password hashes are never logged or
written to audit records. Staff cannot change their own password. Email-change
verification remains a separate one-time link flow. All lifecycle mutations
create append-only `AuditLog` records. Staff authentication validates the RS256
signature and claims, then resolves current session, status, permissions, and
branch scopes from the database on each guarded request. Staff with no assigned
branches have no branch access.

---

## 2. Per-Entity Action Classification

### Order

| Action | Status | Notes |
| --- | --- | --- |
| List | SUPPORTED | Requires `branchId` |
| Detail | SUPPORTED | Includes items, events, assignments |
| Create (Admin) | NOT_SUPPORTED | Customer/checkout path |
| Update fields | NOT_SUPPORTED | |
| Delete | NOT_SUPPORTED | |
| Status transition | SUPPORTED | FSM; body `{ toStatus, reason? }` |
| Reassign branch | SUPPORTED | `{ branchId, reason? }` |
| Cancel / Reject | SUPPORTED | As transitions to `CANCELLED` / `REJECTED` when allowed |
| Refund order status | PARTIALLY_SUPPORTED | `REFUND_PENDING` etc. via transition; money refund via Payment/Refund APIs |
| Duplicate / reorder (Admin) | NOT_SUPPORTED | Customer reorder exists elsewhere |

**Delete behavior:** `DELETE NOT SUPPORTED`

### Category

| Action | Status |
| --- | --- |
| List | SUPPORTED (`parentId?`) |
| Detail | NOT_SUPPORTED (dedicated) |
| Create | SUPPORTED |
| Update | SUPPORTED |
| Delete | NOT_SUPPORTED |
| Activate/Deactivate | SUPPORTED (`isActive` on PATCH) |
| Archive / Restore / Duplicate | NOT_SUPPORTED |

**Delete behavior:** `DEACTIVATE ONLY` (via `isActive`)

### Product

| Action | Status |
| --- | --- |
| List | SUPPORTED (`categoryId?`) |
| Detail | SUPPORTED |
| Create | SUPPORTED |
| Update | SUPPORTED (subset of fields) |
| Delete | NOT_SUPPORTED |
| Activate/Deactivate | SUPPORTED |
| Attach media | SUPPORTED (URL) |
| Change category/slug | NOT_SUPPORTED on update |
| Manage variants | NOT_SUPPORTED |
| Link modifiers/allergens | NOT_SUPPORTED |
| Branch sold-out | SUPPORTED (separate endpoint) |
| Bulk import / duplicate | NOT_SUPPORTED |

**Delete behavior:** `DEACTIVATE ONLY`

### ProductVariant / Modifier / IngredientRemoval

All Admin CRUD: **NOT_SUPPORTED** (schema present; no admin controllers).

### ModifierGroup

| Action | Status |
| --- | --- |
| List | SUPPORTED |
| Create | SUPPORTED (`name`, `selectionMin?`, `selectionMax?`) |
| Update / Delete / Activate | NOT_SUPPORTED |
| Create Modifier under group | NOT_SUPPORTED |

### Allergen

| Action | Status |
| --- | --- |
| List / Create | SUPPORTED; code is generated by the server |
| Update | SUPPORTED (`name`, `description`) |
| Delete | SUPPORTED only when no product is linked |
| Product link / unlink | SUPPORTED (`POST/DELETE /admin/allergens/:allergenId/products/:productId`) |

### ProductMedia

| Action | Status |
| --- | --- |
| Attach (create) | SUPPORTED |
| Binary upload | SUPPORTED (`POST /admin/products/:id/media/upload`, MinIO / S3-compatible) |
| List | SUPPORTED (`GET /admin/products/:id/media`) |
| Update / Delete / Reorder-only API | NOT_SUPPORTED |

### Branch

| Action | Status |
| --- | --- |
| List / Detail / Create | SUPPORTED |
| Update | PARTIALLY_SUPPORTED (DTO subset) |
| Delete / `isActive` toggle | NOT_SUPPORTED |
| Accepting orders | SUPPORTED |
| Pickup/delivery flags / ETA / image / story / geo | NOT_SUPPORTED on Admin PATCH |
| Operating hours replace | SUPPORTED |
| Service area create | SUPPORTED |
| Service area update/delete | NOT_SUPPORTED |
| Product availability upsert | SUPPORTED |

**Delete behavior:** `DELETE NOT SUPPORTED` — pause via `isAcceptingOrders: false`

### Customer / Loyalty

| Action | Status |
| --- | --- |
| List / Detail | SUPPORTED |
| Create / Update / Delete | NOT_SUPPORTED |
| Points balance | SUPPORTED_VIA_COMPOSITION on detail |
| Adjust points / loyalty admin write | NOT_SUPPORTED |

**UI model:** read-only operational profile.

### Promotion

| Action | Status |
| --- | --- |
| List / Detail / Create | SUPPORTED |
| Full field update | NOT_SUPPORTED |
| Activate/Deactivate | SUPPORTED (PATCH `{ isActive }` only) |
| Delete | NOT_SUPPORTED |
| Storefront listing fields on create | PARTIALLY_SUPPORTED | Service accepts `listedOnStorefront` / headlines; **Admin Zod schema omits them** → Admin UI cannot set them today |

### Payment / Refund

| Action | Status |
| --- | --- |
| Payment list/detail | SUPPORTED |
| Payment edit/delete | NOT_SUPPORTED |
| Refund create | SUPPORTED |
| Refund get by id | SUPPORTED |
| Refund list | NOT_SUPPORTED |
| Card PAN/CVV in Admin | NOT_SUPPORTED (forbidden) |

### Courier / Delivery

| Action | Status |
| --- | --- |
| Courier list/create | SUPPORTED |
| Courier update/delete/detail | NOT_SUPPORTED |
| Delivery create | SUPPORTED |
| Admin delivery list/detail | NOT_SUPPORTED |
| Assign / Reassign / QR token | SUPPORTED |
| Delivery status transitions (pickup/on-way/deliver) | Courier app APIs — **not Admin** |

### Staff / Roles / Permissions

| Action | Status |
| --- | --- |
| List users / roles / permissions | SUPPORTED |
| Assign role | SUPPORTED |
| Create user with admin-set password / edit name and verified email / reset password / assign page permissions / deactivate or reactivate | SUPPORTED |
| Hard-delete users | NOT_SUPPORTED |
| Create/edit/delete roles | NOT_SUPPORTED |
| Edit permissions | NOT_SUPPORTED |

### Audit / Settings / Reports

| Entity | Mutations |
| --- | --- |
| Audit | Read list only |
| Settings | List + patch mutable `valueJson` |
| Reports | Read four endpoints only |

---

## 3. Screen-by-Screen Action Contract

### Orders List (`/orders`)

**Visible:** Open detail; branch filter (required server-side); optional client search.  
**Not allowed:** Create order; Delete; Bulk status change; Export (NOT_SUPPORTED).  
**Bulk:** NOT_SUPPORTED.  
**Empty:** “No orders for this branch.” No create CTA.

### Order Detail

**Visible:** Status badge; money; items; events; **Transition** (allowed next only); **Reassign branch**; optional reason.  
**Not allowed:** Edit line items; Delete; Arbitrary status dropdown of all enums.  
**Dangerous:** Cancel, Reject, Reassign — confirmation.

### Kitchen Board (`/kitchen`)

**Visible:** Cards in `BRANCH_ASSIGNED` | `BRANCH_ACCEPTED` | `PREPARING` | `READY_FOR_COURIER`; primary transition CTA; manual refresh.  
**Requires:** `branchId`; `orders.read` (+ `orders.update_status` for actions).  
**Not:** Live push; drag-and-drop unless mapped to legal transitions.

### Products List / Create / Edit

**Visible:** Create; Open; Edit; Activate/Deactivate; Attach media (if `catalog.media.write`).  
**Not allowed:** Delete; Duplicate; Bulk import; Variant editor; Modifier linker.  
**Empty + write:** CTA Create Product. **Empty + read-only:** no CTA.

### Categories

**Visible:** Create; Edit (name/description/order/active).  
**Not:** Delete; Dedicated detail route required.

### Modifiers page

**Visible:** List/search groups; Create/edit group rules; activate/deactivate; create/edit/activate/deactivate modifier options; attach/detach product links.

### Allergens

**Visible:** List; Create.  
**Not:** Edit; Delete; Assign to product.

### Branches / Service areas

**Visible:** Create branch; Edit allowed fields; Toggle accepting orders; Replace hours; Create service area; Set product availability.  
**Not:** Delete branch; Edit geo/code; Edit pickup/delivery flags via Admin; Update/delete service area.

### Customers / Loyalty

**Visible:** List; Open detail; Loyalty lookup by userId.  
**Not:** Any mutate.

### Promotions

**Visible:** Create (kind-dependent); Open detail; Activate/Deactivate.  
**Not:** Edit offer fields after create; Delete.

### Payments / Refunds

**Visible:** List payments; Detail; Create refund (if `payments.refund`); Get refund by id.  
**Not:** Edit/delete payment; Refund list table as primary API; PAN forms.

### Couriers

**Visible:** List; Register; Create delivery; Assign; Reassign; Mint QR.  
**Not:** Admin delivery inbox list; Courier GPS map; Courier status transitions in Admin.

### Users / Roles / Audit / Settings / Reports

As matrix: mostly read + assign role + patch settings. No identity CRUD. No audit mutate. Reports read-only.

---

## 4. Create Form Specifications

### Product Create

| Field | Label | Control | Required | Default | Validation | Source | Permission |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| categoryId | Category | select | Yes | — | UUID | `GET /admin/categories` | `catalog.products.write` |
| slug | Slug | text | Yes | — | 1–128; unique | — | same |
| name | Name | text | Yes | — | 1–128 | — | same |
| description | Description | textarea | No | — | ≤2048 | — | same |
| basePriceMinor | Base price | currency (minor string) | Yes | — | `/^-?\d+$/` | — | same (note: not `catalog.prices.write`) |
| currency | Currency | select/hidden | No | TRY | length 3 | — | same |
| displayOrder | Display order | number | No | 0 | int ≥0 | — | same |

**Immutable after create (no PATCH):** `categoryId`, `slug`.  
**On create:** `isActive` defaults true (not in create body).

### Category Create

| Field | Control | Required | Validation |
| --- | --- | ---: | --- |
| parentCategoryId | select optional | No | UUID |
| slug | text | Yes | 1–128 unique |
| name | text | Yes | 1–128 |
| description | textarea | No | ≤1024 |
| displayOrder | number | No | int ≥0 |

### Allergen Create

`code` (text, required, unique), `name` (required), `description` (optional).

### Modifier Group Create

`name` (required), `selectionMin` (optional ≥0), `selectionMax` (optional ≥0). Defaults min 0 / max 1 in service.

### Product Media Attach

`url` (URL, required), `altText` (optional), `displayOrder` (optional).

### Branch Create

| Field | Required | Validation |
| --- | ---: | --- |
| code | Yes | 1–32 unique |
| name | Yes | 1–128 |
| addressLine | Yes | 1–255 |
| latitude | Yes | -90…90 |
| longitude | Yes | -180…180 |
| phone | No | `+\d{10,15}` |
| minOrderMinor | No | digits string |
| deliveryFeeMinor | No | digits string |

### Service Area Create

`name`, `polygonGeoJson` `{ type: Polygon|MultiPolygon, coordinates }`, `priority?`.

### Operating Hours Put

`hours[]`: `dayOfWeek` 0–6, `opensAt`/`closesAt` `HH:MM`, `isClosed` boolean. **Replaces** set.

### Branch Product Availability

`isAvailable` boolean required; `reason` optional ≤255.

### Promotion Create

| Field | Required | Conditional |
| --- | ---: | --- |
| name | Yes | always |
| kind | Yes | enum |
| code | No | coupon code |
| discountMinor | kind-dependent | show when `FIXED_CART_MINOR` |
| discountPercentBps | kind-dependent | show when `PERCENT_CART` (0–10000 bps) |
| minMerchandiseMinor | No | all kinds |
| validFrom / validTo | No | ISO datetime |
| branchIds | No | multi-select UUID |
| usageLimitTotal / PerCustomer | No | int ≥1 |
| combinable / firstOrderOnly | No | toggles |

**Not in Admin create schema (despite service):** `listedOnStorefront`, `customerHeadline`, `customerDescription` → treat as NOT_SUPPORTED for Admin form unless API extended.

**Created active:** `isActive: true` by service.

### Courier Register

`userId` (UUID existing user), `displayName`, `phone?`, `maxActiveDeliveries?` (1–20).

### Delivery Create

`orderId`, `branchId` required; optional recipient/address/geo/note.

### Refund Create

`amountMinor` (required digits), `reason?` ≤255. Under payment id.

### Role Assign

`roleId` UUID.

### Setting Patch

`valueJson` any JSON matching setting’s `valueType` (infer from listed setting).

### Order Transition / Reassign (not “create”)

Transition: `toStatus` (enum), `reason?`.  
Reassign: `branchId`, `reason?`.

---

## 5. Update Form Specifications

### Product Update

| Field | Editable |
| --- | ---: |
| id, slug, categoryId, currency, createdAt | No (read-only / omit) |
| name, description, basePriceMinor, displayOrder, isActive | Yes |

`catalog.prices.write` is **not** checked on PATCH — price edits use `catalog.products.write`.

### Category Update

Editable: `name`, `description`, `displayOrder`, `isActive`.  
Not: `slug`, `parentCategoryId`.

### Branch Update

Editable: `name`, `addressLine`, `phone`, `isAcceptingOrders`, `minOrderMinor`, `deliveryFeeMinor`.  
Read-only in Admin: `code`, lat/lng, `isActive`, pickup/delivery enabled, ETA, `storyBody`, `imageUrl`.

### Promotion Update

**Only** `isActive`. All other fields read-only after create.

### Settings Update

Only `valueJson` for keys with `mutable: true`. Immutable keys → API “not mutable”.

---

## 6. Delete / Archive Behavior (explicit)

| Entity | Verdict |
| --- | --- |
| Order | DELETE NOT SUPPORTED |
| Product | DEACTIVATE ONLY (`isActive`) |
| Category | DEACTIVATE ONLY |
| Promotion | DEACTIVATE ONLY |
| Branch | DELETE NOT SUPPORTED; pause via `isAcceptingOrders` |
| Customer | DELETE NOT SUPPORTED |
| Payment / Refund | DELETE NOT SUPPORTED |
| Media / ServiceArea / Modifier / Variant | DELETE NOT SUPPORTED |
| Staff / Role | DELETE NOT SUPPORTED |
| Audit / Report | N/A |

**Stitch rule:** No trash icons / Delete buttons / delete bulk actions for these entities.

---

## 7. Detail Page Specs (summary)

### Order Detail

- **Header:** short id, status badge, fulfillment mode, branch, created/scheduled times  
- **Sections:** money breakdown; line items (+ modifiers/removals); prefs/address/notes; event timeline; branch assignments  
- **Actions:** legal transitions; reassign branch  
- **Dangerous:** CANCELLED, REJECTED, reassign  
- **Read-only:** all commercial fields; items snapshots  

### Product Detail / Edit

- Header: name, active badge, price  
- Sections: basics; pricing; media attach; (variants/modifiers as read-only UNKNOWN if returned — **no edit**)  
- Actions: save patch; deactivate; attach media  

### Branch Detail

- Header: name, code, accepting-orders badge  
- Sections: contact/fees; hours editor; service areas list + create; product availability tool  
- Dangerous: disable accepting orders  

### Customer Detail

- Read-only: phone, verified, displayName, account status, pointsBalance  
- **No edit actions**  

### Payment Detail

- Read-only attempt fields  
- Action: Create refund (permission-gated)  

### Promotion Detail

- Read-only offer definition  
- Action: Activate / Deactivate  

---

## 8. Table Specs (server vs client)

### Orders

| Column | Format | Search | Filter | Sort | Mobile |
| --- | --- | ---: | ---: | ---: | --- |
| id | shortened UUID | client | No | UNKNOWN | High |
| status | badge | No | client | UNKNOWN | High |
| fulfillmentMode | text | No | client | No | Med |
| branchId | label | No | **server `branchId` required** | No | High |
| finalPayableMinor | TRY | No | No | UNKNOWN | High |
| createdAt | Istanbul datetime | No | No | UNKNOWN | Med |

Server pagination: **UNKNOWN** (returns branch list). Client search used in admin-web.

### Products

| Column | Filter | Notes |
| --- | --- | --- |
| name, slug, category, basePriceMinor, isActive, displayOrder | `categoryId` server | No server search confirmed |

### Others

Payments / Customers / Promotions / Couriers / Users / Audit / Reports: **list endpoints without documented filter/sort/search query params** → treat filter/search as client-side composition unless proven otherwise. Customers list capped (~50).

---

## 9. Empty State Actions

| List | Write permission | Read-only |
| --- | --- | --- |
| Products | CTA Create Product | “No products found.” |
| Categories | CTA Create | text only |
| Branches | CTA Create Branch | text only |
| Promotions | CTA Create | text only |
| Couriers | CTA Register | text only |
| Orders / Kitchen / Payments / Customers / Audit / Reports | no create CTA | explanatory empty |
| Refunds | CTA only from Payment detail | — |

---

## 10. Action Menu Semantics (priority)

| Priority | Pattern | Examples |
| --- | --- | --- |
| Primary page | solid button | Create Product; Save; Advance kitchen status |
| Secondary | outline | Attach media; Replace hours |
| Row | open detail; inline active toggle | Product isActive |
| Kebab | low-frequency | Reassign branch; Mint QR |
| Detail action bar | sticky | Order transitions |
| Modal | confirm + refund/role/settings | |
| Drawer | optional quick edit / media | |
| Inline toggle | isActive / isAcceptingOrders | |

---

## 11. Confirmation Matrix

| Action | Confirmation | Reason | Permission |
| --- | ---: | --- | --- |
| Transition → CANCELLED | Yes (strong) | Loses fulfillment | `orders.update_status` |
| Transition → REJECTED | Yes (strong) | Branch refusal | same |
| Other kitchen advances | Optional light | Operational | same |
| Reassign branch | Yes (strong) | Ops disruption | `orders.reassign_branch` |
| Create refund | Yes (strong + amount review) | Financial | `payments.refund` |
| Assign role | Yes (strong) | Privilege escalation | `users.write` |
| Settings patch | Yes | Config blast radius | `settings.write` |
| isAcceptingOrders → false | Yes | Stops revenue | `branches.write` |
| Product / category / promotion deactivate | Recommended | Soft removal | write perms |
| Attach media / create catalog | No | Low risk | write |
| Mint QR | Recommended (show once) | Token secrecy | `couriers.assign` |

---

## 12. Success / Failure Interactions

| Mutation | Success | Failure |
| --- | --- | --- |
| Order transition | Refresh detail/timeline; toast | `ORDER_INVALID_TRANSITION`; keep prior status |
| Reassign | Updated branch on detail | `ORDER_BRANCH_REASSIGNMENT_NOT_ALLOWED` |
| Product/Category create | Redirect or open detail; toast | Validation; slug exists |
| Refund | Show refund id; refresh payment | `REFUND_NOT_ALLOWED` / amount errors |
| Role assign | Toast; refresh user roles | Not found / already assigned |
| Setting patch | Refresh row | Not found / not mutable |
| Permission denied | 403 → access-denied | Hide action if possible |
| Validation | Inline field errors | — |

Prevent double-submit on refund, transition, role assign, settings.

---

## 13. Order Action Matrix (FSM)

Source: `apps/api/src/modules/order/order-state-machine.ts`

| Current Status | Allowed Next | UI Action label (example) | Confirm? | Permission |
| --- | --- | ---: | ---: | --- |
| DRAFT | PAYMENT_PENDING, CANCELLED | Start payment / Cancel | Cancel yes | `orders.update_status` |
| CREATED | PAYMENT_PENDING, CANCELLED | same | Cancel yes | same |
| PAYMENT_PENDING | PAID, PAYMENT_FAILED, CANCELLED | Mark paid* / Fail / Cancel | Cancel yes | same |
| PAYMENT_FAILED | PAYMENT_PENDING, CANCELLED | Retry pending / Cancel | Cancel yes | same |
| PAID | BRANCH_ASSIGNED, CANCELLED, REFUND_PENDING | Assign branch / Cancel / Start refund | Cancel/refund yes | same |
| BRANCH_ASSIGNED | BRANCH_ACCEPTED, REJECTED, CANCELLED | Accept / Reject / Cancel | Reject/Cancel yes | same |
| BRANCH_ACCEPTED | PREPARING, REJECTED, CANCELLED | Start prep / Reject / Cancel | Reject/Cancel yes | same |
| PREPARING | READY_FOR_COURIER, CANCELLED | Mark ready / Cancel | Cancel yes | same |
| READY_FOR_COURIER | COURIER_ASSIGNED, CANCELLED | Assign courier status / Cancel | Cancel yes | same |
| COURIER_ASSIGNED | PICKED_UP, CANCELLED | Picked up / Cancel | Cancel yes | same |
| PICKED_UP | ON_THE_WAY | Out for delivery | No | same |
| ON_THE_WAY | DELIVERED | Delivered | No | same |
| DELIVERED | REFUND_PENDING | Start refund path | Yes | same |
| REJECTED | REFUND_PENDING | Start refund path | Yes | same |
| CANCELLED | REFUND_PENDING | Start refund path | Yes | same |
| REFUND_PENDING | PARTIALLY_REFUNDED, REFUNDED | Partial / Full refunded | Yes | same |
| PARTIALLY_REFUNDED | REFUNDED | Complete refund | Yes | same |
| REFUNDED | — | — | — | — |

\*Marking `PAID` manually may be ops-sensitive; payment provider webhooks normally drive payment truth — UI should still only offer FSM-legal targets.

**Pickup:** same status machine; delivery address may be absent; courier states less relevant but still in FSM.

**Reassign branch:** separate action, not a status.

---

## 14. Kitchen Interaction Matrix

| Visible status | Primary CTA (typical) | Permission |
| --- | --- | --- |
| BRANCH_ASSIGNED | Accept → BRANCH_ACCEPTED | `orders.update_status` |
| BRANCH_ACCEPTED | Start prep → PREPARING | same |
| PREPARING | Ready → READY_FOR_COURIER | same |
| READY_FOR_COURIER | Hand off (COURIER_ASSIGNED) or leave for dispatch | same |

- Filter: **required** `branchId`  
- Refresh: **manual / polling** — no WebSocket/SSE  
- Cards without `orders.update_status`: read-only  
- Reject/Cancel from kitchen: confirmation; only if FSM allows from current status  

---

## 15. Catalog Depth Notes

**Global product `isActive`** ≠ **branch `isAvailable`**.  
- Global off → hidden everywhere (deactivate).  
- Branch sold-out → temporary unavailability for one branch (`branches.service_areas.write`).

Variants, modifiers, allergen links, ingredient removals: **schema only** — do not design Admin editors as current capability.

---

## 16. Permission × Action Matrix

| Action | Permission to see page | Permission to act |
| --- | --- | --- |
| View orders/kitchen | `orders.read` | — |
| Transition order | `orders.read` | `orders.update_status` |
| Reassign branch | `orders.read` | `orders.reassign_branch` |
| View catalog | `catalog.products.read` | — |
| Create/update product/category/allergen/group | read | `catalog.products.write` |
| Attach media | read | `catalog.media.write` |
| View branches | `branches.read` | — |
| Create/update branch/hours | read | `branches.write` |
| Service area / availability | read | `branches.service_areas.write` |
| View customers/loyalty UI | `customers.read` / `loyalty.read` | — |
| Promotions mutate | `promotions.read` | `promotions.write` |
| View payments/refund get | `payments.read` | — |
| Create refund | `payments.read` | `payments.refund` |
| Couriers list | `couriers.read` | — |
| Register courier | read | `couriers.write` |
| Delivery assign/QR | read | `couriers.assign` |
| Reports | `reports.read` | — |
| Users/roles list | `users.read` | — |
| Assign role | read | `users.write` |
| Audit | `audit.read` | — |
| Settings | `settings.read` | `settings.write` |

`loyalty.settings.write` and `catalog.prices.write` exist as codes but are **not wired** to distinct Admin routes found in this pass.

---

## 17. CRUD UI States (all mutating screens)

Must support: loading; empty; validation error; API error; success; 403; disabled (missing permission or illegal transition); confirmation pending; mutation in progress (disable submit).

---

## 18. Responsive CRUD Behavior

- **Desktop:** dense tables; detail + action rail; drawers for media/QR.  
- **Tablet (kitchen):** large status CTAs; stacked columns; refresh control.  
- **Mobile:** priority columns; card fallback for orders; stacked forms; sticky Save/Transition; filter sheet; confirmations full-screen friendly — **do not hide** cancel/refund/role actions.

---

## 19. GOOGLE STITCH CRUD CHEAT SHEET

### ORDERS
```text
Can: list (by branch), detail, transition status (FSM), reassign branch, kitchen board
Cannot: create, edit fields, delete, bulk update, arbitrary status dropdown
Primary screens: Orders List, Order Detail, Kitchen
```

### PRODUCTS
```text
Can: list, detail, create, edit (name/description/price/order/active), activate/deactivate, attach image URL, branch sold-out
Cannot: hard delete, change slug/category after create, variants, modifier links, allergen links, bulk import, duplicate
```

### CATEGORIES
```text
Can: list, create, edit, activate/deactivate
Cannot: delete, dedicated detail API, change slug/parent on update
```

### MODIFIER GROUPS
```text
Can: list, create
Cannot: update, delete, create modifiers, link to products
```

### ALLERGENS
```text
Can: list, create
Cannot: update, delete, attach to products via Admin
```

### MEDIA
```text
Can: attach URL to product
Cannot: upload binary, edit, delete, reorder-only endpoint
```

### BRANCHES
```text
Can: list, detail, create, edit (name/address/phone/accepting/min order/fee), replace hours, create service area, set product availability
Cannot: delete, toggle isActive, edit geo/code/pickup/delivery/ETA/image/story via Admin PATCH, edit/delete service areas
```

### CUSTOMERS / LOYALTY
```text
Can: list, detail (incl. points), loyalty lookup
Cannot: create, edit, delete, adjust points
UI: read-only profile
```

### PROMOTIONS
```text
Can: list, detail, create (3 kinds), activate/deactivate
Cannot: edit offer fields after create, delete, set storefront listing fields via Admin schema
```

### PAYMENTS / REFUNDS
```text
Can: list/detail payments, create refund, get refund by id
Cannot: edit/delete payment, refund list API, card data entry
```

### COURIERS / DELIVERIES
```text
Can: list/create couriers, create delivery, assign, reassign, mint QR
Cannot: admin delivery list/detail, courier edit/delete, admin delivery status machine, live map
```

### USERS / ROLES / PERMISSIONS
```text
Can: list users/roles/permissions, create staff accounts with administrator-set passwords, edit names, verify email changes, reset passwords, assign page/action permissions, deactivate or reactivate accounts
Cannot: hard-delete users, CRUD roles, edit permission definitions, change their own password
```

### AUDIT / SETTINGS / REPORTS
```text
Audit: list only
Settings: list + edit mutable valueJson (confirm)
Reports: four read-only views
```

---

## 20. Source References

```text
apps/api/src/modules/admin/admin-catalog.controller.ts
apps/api/src/modules/admin/admin-branch.controller.ts
apps/api/src/modules/admin/admin-customer.controller.ts
apps/api/src/modules/admin/admin-payment.controller.ts
apps/api/src/modules/admin/admin-user.controller.ts
apps/api/src/modules/admin/admin-settings.controller.ts
apps/api/src/modules/admin/admin-audit.controller.ts
apps/api/src/modules/promotion/admin-promotion.controller.ts
apps/api/src/modules/order/order.controller.ts
apps/api/src/modules/order/order-state-machine.ts
apps/api/src/modules/courier/courier.controller.ts
apps/api/src/modules/courier/delivery-state-machine.ts
apps/api/src/modules/refund/refund.controller.ts
apps/api/src/modules/reporting/reporting.controller.ts
packages/domain-types/src/permissions.ts
apps/api/prisma/schema.prisma
```
