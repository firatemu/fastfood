# API Response and Error Contract

## 1. Objective

Every application must consume one predictable API contract. Controllers must not return unrelated envelope styles.

## 2. Success response

Single-resource success:

```json
{
  "data": {
    "id": "019..."
  },
  "meta": {
    "requestId": "019..."
  }
}
```

`meta` may contain additional non-business response metadata.

## 3. List response

```json
{
  "data": [],
  "meta": {
    "requestId": "019...",
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "totalItems": 240,
      "totalPages": 10
    }
  }
}
```

Default `pageSize=25`, maximum `100` unless endpoint contract explicitly requires another limit.

## 4. Error response

```json
{
  "error": {
    "code": "ORDER_INVALID_TRANSITION",
    "message": "The order cannot move to the requested state.",
    "details": null,
    "requestId": "019..."
  }
}
```

`message` is safe for client display/logging. Internal stack traces/provider secrets are never included.

## 5. Validation error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": {
      "fields": [
        { "path": "phone", "code": "INVALID_PHONE", "message": "Enter a valid phone number." }
      ]
    },
    "requestId": "019..."
  }
}
```

## 6. HTTP mapping

Canonical guidance:

| HTTP | Meaning |
|---:|---|
| 400 | malformed request / invalid generic input |
| 401 | unauthenticated/invalid auth |
| 403 | authenticated but not permitted |
| 404 | resource not found or intentionally hidden by access policy |
| 409 | state/concurrency/idempotency conflict |
| 422 | semantically valid shape but business validation fails |
| 429 | rate limit |
| 500 | unexpected internal error |
| 502/503 | upstream/dependency unavailable where appropriate |

## 7. Canonical error code groups

Examples:

### Auth

- `AUTH_UNAUTHENTICATED`
- `AUTH_SESSION_EXPIRED`
- `AUTH_ACCOUNT_DISABLED`
- `AUTH_PERMISSION_DENIED`
- `AUTH_SCOPE_DENIED`

### Address/branch

- `ADDRESS_LOCATION_REQUIRED`
- `ADDRESS_NOT_SERVICEABLE`
- `BRANCH_NOT_ACCEPTING_ORDERS`
- `BRANCH_ROUTING_AMBIGUOUS`

### Catalog/cart

- `PRODUCT_UNAVAILABLE`
- `VARIANT_UNAVAILABLE`
- `MODIFIER_INVALID_SELECTION`
- `CART_MINIMUM_ORDER_NOT_MET`
- `CHECKOUT_QUOTE_EXPIRED`

### Loyalty

- `LOYALTY_INSUFFICIENT_BALANCE`
- `LOYALTY_REDEMPTION_LIMIT_EXCEEDED`
- `LOYALTY_RESERVATION_EXPIRED`

### Payment

- `PAYMENT_INITIALIZATION_FAILED`
- `PAYMENT_PENDING`
- `PAYMENT_FAILED`
- `PAYMENT_VERIFICATION_FAILED`
- `REFUND_NOT_ALLOWED`

### Order/delivery

- `ORDER_INVALID_TRANSITION`
- `ORDER_BRANCH_REASSIGNMENT_NOT_ALLOWED`
- `DELIVERY_ALREADY_ASSIGNED`
- `DELIVERY_COURIER_LIMIT_REACHED`
- `QR_CLAIM_INVALID`
- `COURIER_USERNAME_TAKEN`
- `COURIER_BRANCH_REQUIRED`
- `COURIER_HAS_ACTIVE_DELIVERY`

## 8. Provider error mapping

Provider-specific error codes may be logged in sanitized structured fields but clients receive FASTFOOD canonical codes. Do not leak provider stack traces or secrets.

## 9. Request IDs

Every API response includes/propagates a request/correlation ID. Incoming trusted request IDs may be validated; otherwise the server generates one.

## 10. Compatibility

Changing field meaning/removing fields from public app contracts requires versioning/migration consideration. Additive fields are preferred.
