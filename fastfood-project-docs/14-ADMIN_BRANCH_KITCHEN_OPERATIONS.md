# Admin, Branch, and Kitchen Operations

## 1. Admin Web purpose

Admin Web is the operational control plane for Head Office and branch users. It must prioritize clarity, speed, auditability, and dense information over storefront-style visual marketing.

## 2. Main modules

- Dashboard
- Orders
- Kitchen board
- Products
- Categories
- Modifiers
- Allergens
- Media
- Branches
- Service areas
- Couriers
- Users/Roles/Permissions
- Loyalty
- Promotions
- Payments/Refunds
- Reports
- Audit log
- System/business settings

Visibility is permission-driven, but API authorization is still mandatory.

## 3. Order operations

Authorized staff can:

- view order detail,
- see customer delivery data required for operations,
- inspect line customizations,
- inspect payment state,
- inspect branch assignment,
- update allowed fulfillment states,
- reassign branch if permitted,
- assign/reassign courier where permitted,
- cancel/reject where policy allows,
- initiate refund where separately permitted.

## 4. Kitchen board

The kitchen board must support fast operational scanning and status changes.

Core columns/phases:

- New / Awaiting acceptance
- Accepted
- Preparing
- Ready for courier

The exact visual layout may be Kanban-like or queue/table-based, but the underlying status machine is canonical.

## 5. Branch restrictions

Branch users:

- see only scoped branch orders and reports,
- cannot edit global catalog price/content by default,
- may mark branch-level temporary product unavailability if permissioned,
- may update kitchen states for scoped orders,
- may view courier handoff data relevant to scoped orders.

## 6. Temporary sold-out

Branch availability overrides require:

- branch ID,
- product/variant target,
- unavailable state,
- optional reason,
- start timestamp,
- optional expiry,
- actor/audit data.

An expired temporary override should automatically stop applying.

## 7. Operational concurrency

Order updates use optimistic concurrency/version checks or transactional state validation. Two operators must not overwrite each other's state changes silently.

## 8. Admin UX conventions

- searchable/filterable data views,
- persistent filters where useful,
- clear permission-denied states,
- bulk actions only when transaction semantics are defined,
- destructive actions require explicit confirmation,
- high-risk actions display reason fields when required by audit policy.
