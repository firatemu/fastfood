# Functional Requirements Matrix

Each requirement ID is stable and may be referenced by tests, prompts, issues, and implementation notes.

## Customer and identity

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-001 | Customer can authenticate through phone OTP architecture | Must |
| FR-AUTH-002 | Non-production can use fake OTP provider | Must |
| FR-AUTH-003 | Guest checkout is supported | Must |
| FR-ACC-001 | Registered customer can manage profile | Must |
| FR-ACC-002 | Registered customer can view order history | Must |
| FR-ACC-003 | Registered customer can view loyalty history/balance | Must |

## Address and geolocation

| ID | Requirement | Priority |
|---|---|---|
| FR-ADDR-001 | Address cannot be saved without map-confirmed coordinates | Must |
| FR-ADDR-002 | Address stores latitude/longitude | Must |
| FR-ADDR-003 | Serviceability is checked against branch/service rules | Must |
| FR-ADDR-004 | Customer can manage multiple addresses | Must |

## Catalog

| ID | Requirement | Priority |
|---|---|---|
| FR-CAT-001 | Categories can be managed | Must |
| FR-CAT-002 | Products support multiple images | Must |
| FR-CAT-003 | Products support allergens | Must |
| FR-CAT-004 | Products support variants | Must |
| FR-CAT-005 | Products support modifier groups/modifiers | Must |
| FR-CAT-006 | Products support removable ingredients | Must |
| FR-CAT-007 | Branch temporary sold-out override is supported | Must |

## Cart and checkout

| ID | Requirement | Priority |
|---|---|---|
| FR-CART-001 | Customer can add configured product to cart | Must |
| FR-CART-002 | Customer can edit/remove cart lines | Must |
| FR-PRICE-001 | Backend is price authority | Must |
| FR-CHK-001 | Address/serviceability precedes payment | Must |
| FR-CHK-002 | Branch is resolved before payment initialization | Must |

## Payment

| ID | Requirement | Priority |
|---|---|---|
| FR-PAY-001 | iyzico is supported through provider adapter | Must |
| FR-PAY-002 | Sandbox/test mode is used outside production | Must |
| FR-PAY-003 | Redirect alone cannot prove payment success | Must |
| FR-PAY-004 | Callback/webhook processing is idempotent | Must |
| FR-PAY-005 | Refund records and authorized refund flow exist | Must |

## Loyalty

| ID | Requirement | Priority |
|---|---|---|
| FR-LOY-001 | Loyalty uses immutable ledger entries | Must |
| FR-LOY-002 | Redemption reserves points before payment finalization | Must |
| FR-LOY-003 | Failed payment releases reservation | Must |
| FR-LOY-004 | Earned points finalize after DELIVERED | Must |
| FR-LOY-005 | Concurrent redemption cannot overspend balance | Must |

## Branch and kitchen

| ID | Requirement | Priority |
|---|---|---|
| FR-BR-001 | Multiple branches are supported | Must |
| FR-BR-002 | Service areas route orders deterministically | Must |
| FR-BR-003 | Authorized user can manually reassign branch | Must |
| FR-KIT-001 | Branch can accept eligible order | Must |
| FR-KIT-002 | Preparing and ready states are supported | Must |
| FR-KIT-003 | Branch users are branch-scoped | Must |

## Courier

| ID | Requirement | Priority |
|---|---|---|
| FR-CUR-001 | Courier has dedicated login/app | Must |
| FR-CUR-002 | Courier can see only authorized deliveries | Must |
| FR-CUR-003 | Courier can claim eligible order with secure QR | Must |
| FR-CUR-004 | Competing QR claim is atomic | Must |
| FR-CUR-005 | Courier can open destination in Google Maps | Must |
| FR-CUR-006 | Pickup and delivery timestamps are recorded | Must |
| FR-CUR-007 | Live location capability exists | Must |
| FR-CUR-008 | Courier can view own delivery metrics | Must |

## Admin/security/reporting

| ID | Requirement | Priority |
|---|---|---|
| FR-RBAC-001 | Backend enforces permissions | Must |
| FR-RBAC-002 | Backend enforces resource/branch scope | Must |
| FR-AUD-001 | Critical admin/financial actions are audited | Must |
| FR-REP-001 | Admin can report across all branches when authorized | Must |
| FR-REP-002 | Branch reports are branch-scoped | Must |
| FR-DS-001 | Production UI uses centralized design system | Must |
| FR-RESP-001 | Web applications are fully responsive | Must |
| FR-MOB-001 | Customer and courier apps target iOS and Android from same Expo codebase per app | Must |
