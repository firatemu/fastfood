# System Defaults and Business Configuration

## 1. Purpose

This document gives AI agents deterministic starting values. Business-configurable values may later be changed by authorized administrators, but code must not invent alternatives.

## 2. Configuration categories

- **System setting:** controlled by environment/config, not ordinary admin UI.
- **Business setting:** may be changed by authorized HQ user.
- **Branch setting:** may vary by branch.
- **Feature flag:** centrally controlled release switch.

## 3. Canonical baseline values

| Key | Default | Unit | Type | Mutable? | Notes |
|---|---:|---|---|---|---|
| `LOYALTY_EARN_RATE_BPS` | 500 | basis points | Business | Yes | 5.00% |
| `LOYALTY_POINT_VALUE_MINOR` | 1 | kuruş per point | System/Business | Controlled | 100 points = 1 TRY |
| `LOYALTY_MAX_REDEMPTION_BPS` | 5000 | basis points | Business | Yes | max 50% of eligible payable amount |
| `LOYALTY_MIN_REDEEM_POINTS` | 100 | points | Business | Yes | 1 TRY minimum |
| `LOYALTY_EXPIRY_DAYS` | 365 | days | Business | Yes | confirmed points |
| `LOYALTY_RESERVATION_TTL_MINUTES` | 30 | minutes | System | Yes via config | stale checkout cleanup |
| `OTP_TTL_SECONDS` | 180 | seconds | System | Env | 3 minutes |
| `OTP_MAX_VERIFY_ATTEMPTS` | 5 | attempts | System | Env | per challenge |
| `OTP_REQUEST_COOLDOWN_SECONDS` | 60 | seconds | System | Env | resend cooldown |
| `OTP_MAX_REQUESTS_PER_15_MIN` | 5 | requests | System | Env | per normalized phone/device/IP risk policy |
| `ACCESS_TOKEN_TTL_MINUTES` | 15 | minutes | System | Env | staff/customer access token |
| `REFRESH_SESSION_TTL_DAYS` | 30 | days | System | Env | rotating session |
| `CHECKOUT_QUOTE_TTL_MINUTES` | 10 | minutes | System | Config | price/serviceability quote |
| `DEFAULT_BRANCH_MIN_ORDER_MINOR` | 0 | kuruş | Branch | Yes | deterministic seed only; production branch activation requires explicit review |
| `DEFAULT_DELIVERY_FEE_MINOR` | 0 | kuruş | Branch/Area | Yes | deterministic seed only; production review required |
| `COURIER_MAX_ACTIVE_DELIVERIES` | 3 | deliveries | Business | Yes | concurrent active assignments |
| `PREPARATION_SLA_MINUTES` | 20 | minutes | Branch | Yes | initial operational target |
| `COURIER_PICKUP_WAIT_SLA_MINUTES` | 10 | minutes | Branch | Yes | ready to pickup target |
| `DELIVERY_SLA_MINUTES` | 30 | minutes | Branch/Area | Yes | pickup to delivered target |
| `COURIER_LOCATION_INTERVAL_SECONDS` | 10 | seconds | System | Config | active delivery target; platform may coalesce |
| `COURIER_RAW_LOCATION_RETENTION_DAYS` | 30 | days | System | Controlled | raw GPS points |
| `AUDIT_LOG_ONLINE_RETENTION_DAYS` | 365 | days | System | Controlled | legal policy may require longer archive |
| `MAX_PAGE_SIZE` | 100 | rows | System | No ordinary admin | API safety |
| `DEFAULT_PAGE_SIZE` | 25 | rows | System | Client choice within max | admin lists |
| `MAX_UPLOAD_IMAGE_MB` | 10 | MB | System | Env | original image limit |
| `PAYMENT_STALE_PENDING_MINUTES` | 15 | minutes | System | Config | reconciliation trigger, not automatic failure without provider check |
| `PAYMENT_MIN_CHARGE_MINOR` | 100 | TRY minor units | System/Provider | Controlled | project baseline = 1.00 TRY; production value must be raised if provider contract requires a higher minimum |

## 4. Production activation guard

A branch cannot be marked production-ready until an authorized user has explicitly reviewed:

- minimum order,
- delivery fee/service-area fee,
- operating hours,
- service areas,
- order acceptance status,
- catalog availability.

This prevents deterministic development defaults such as zero delivery fee from silently becoming unintended commercial policy.

## 5. Feature flags baseline

| Flag | Development | Staging | Production baseline |
|---|---:|---:|---:|
| `customer.liveCourierMap` | On | On | Off until explicit release approval |
| `orders.pickup` | Off | Off | Off |
| `orders.scheduled` | Off | Off | Off |
| `payments.cashOnDelivery` | Off | Off | Off |
| `catalog.branchPriceOverrides` | Off | Off | Off |
| `promotions.advancedRules` | Off | Off | Off |

Production feature flags are persisted centrally and changed only by an authorized HQ/system operator with audit logging. An AI agent must not enable a production feature merely because implementation exists.

## 6. Environment rule

Configuration is validated at application startup. Missing mandatory production settings cause startup/readiness failure rather than silent fallback to insecure development behavior.
