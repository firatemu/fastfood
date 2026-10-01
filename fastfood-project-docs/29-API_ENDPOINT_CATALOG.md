# API Endpoint Catalog

> Endpoint names are canonical baseline. Detailed DTOs are implemented from contracts and OpenAPI. Breaking route changes require documentation update.

## Authentication

```text
POST   /api/v1/auth/customer/otp/request
POST   /api/v1/auth/customer/otp/verify
POST   /api/v1/auth/staff/login
POST   /api/v1/auth/staff/mfa/verify
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:sessionId
```

## Customer

```text
GET    /api/v1/me
PATCH  /api/v1/me
GET    /api/v1/me/orders
GET    /api/v1/me/loyalty
GET    /api/v1/me/addresses
POST   /api/v1/me/addresses
PATCH  /api/v1/me/addresses/:addressId
DELETE /api/v1/me/addresses/:addressId
```

## Storefront catalog

```text
GET /api/v1/storefront/categories
GET /api/v1/storefront/products
GET /api/v1/storefront/products/:slug
GET /api/v1/storefront/serviceability
```

## Cart/checkout

```text
POST /api/v1/checkout/quote
POST /api/v1/checkout/loyalty/reserve
DELETE /api/v1/checkout/loyalty/reservation/:reservationId
POST /api/v1/checkout/payment/initialize
GET  /api/v1/checkout/status/:checkoutId
```

## Payment callbacks/integration

```text
POST /api/v1/integrations/iyzico/callback
POST /api/v1/integrations/iyzico/webhook
```

## Customer order access

```text
GET /api/v1/orders/:orderId
GET /api/v1/orders/:orderId/timeline
```

Guest access uses a secure guest token/session mechanism in addition to resource ID.

## Admin catalog

```text
GET/POST        /api/v1/admin/categories
GET/POST        /api/v1/admin/products
GET/PATCH       /api/v1/admin/products/:productId
POST            /api/v1/admin/products/:productId/media
GET/POST        /api/v1/admin/allergens
PATCH/DELETE    /api/v1/admin/allergens/:allergenId
POST/DELETE     /api/v1/admin/allergens/:allergenId/products/:productId
GET/POST        /api/v1/admin/modifier-groups
PATCH           /api/v1/admin/modifier-groups/:groupId
POST            /api/v1/admin/modifier-groups/:groupId/modifiers
PATCH           /api/v1/admin/modifier-groups/:groupId/modifiers/:modifierId
POST/DELETE     /api/v1/admin/modifier-groups/:groupId/products/:productId
```

Modifier-group list accepts `includeInactive=true` for catalog maintenance and
returns each group's options plus linked product summaries. Groups and options
are deactivated with `isActive=false` to preserve historical catalog references;
product-group links can be attached or detached.

## Branches/service areas

```text
GET/POST  /api/v1/admin/branches
GET/PATCH /api/v1/admin/branches/:branchId
GET/POST  /api/v1/admin/branches/:branchId/service-areas
PATCH     /api/v1/admin/branches/:branchId/product-availability/:productId
```

## Orders/kitchen

```text
GET   /api/v1/admin/orders
GET   /api/v1/admin/orders/:orderId
POST  /api/v1/admin/orders/:orderId/transitions
POST  /api/v1/admin/orders/:orderId/reassign-branch
GET   /api/v1/admin/kitchen
```

## Courier/delivery

```text
GET  /api/v1/courier/deliveries
GET  /api/v1/courier/deliveries/:deliveryId
GET  /api/v1/courier/deliveries/:deliveryId/navigation
POST /api/v1/courier/claims/qr
POST /api/v1/courier/deliveries/:deliveryId/pickup
POST /api/v1/courier/deliveries/:deliveryId/on-the-way
POST /api/v1/courier/deliveries/:deliveryId/deliver
POST /api/v1/courier/deliveries/:deliveryId/location
GET  /api/v1/courier/me/performance
```

Courier Web browser authentication uses the staff login and MFA endpoints below plus cookie-backed refresh/logout. The refresh cookie is HttpOnly and scoped to the staff auth route family; browser access tokens remain in memory.

```text
POST /api/v1/auth/staff/login
POST /api/v1/auth/staff/mfa/verify
POST /api/v1/auth/staff/refresh
POST /api/v1/auth/staff/logout
```

## Courier management

```text
GET  /api/v1/admin/couriers
POST /api/v1/admin/deliveries/:deliveryId/assign
POST /api/v1/admin/deliveries/:deliveryId/reassign
```

## Payments/refunds

```text
GET  /api/v1/admin/payments
GET  /api/v1/admin/payments/:paymentId
POST /api/v1/admin/payments/:paymentId/refunds
GET  /api/v1/admin/refunds/:refundId
```

## Reports/audit/settings

```text
GET   /api/v1/admin/reports/sales
GET   /api/v1/admin/reports/branches?date=YYYY-MM-DD (optional; Europe/Istanbul order-created day)
GET   /api/v1/admin/reports/products
GET   /api/v1/admin/reports/couriers
GET   /api/v1/admin/audit
GET   /api/v1/admin/settings
PATCH /api/v1/admin/settings/:key
```

## Infrastructure

```text
GET /health/live
GET /health/ready
GET /api/v1/version
```
