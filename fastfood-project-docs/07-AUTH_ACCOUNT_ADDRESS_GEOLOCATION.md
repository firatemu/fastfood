# Authentication, Account, Address, and Geolocation

## 1. Identity separation

Customer authentication and staff authentication are separate policy domains even if both use the same identity infrastructure.

## 2. Customer authentication

Canonical production customer authentication is phone-based OTP/passwordless authentication.

> **Status (Sep 2026, ADR-010):** SMS OTP is **suspended** for customer
> registration during UI maturation. New customers can be created with
> phone + password + KVKK only on `apps/storefront-web` and
> `apps/customer-mobile`. The OTP endpoints and code paths remain
> mounted and are reachable by config flip
> (`CUSTOMER_REGISTRATION_OTP_SUSPENDED=false`). The phone field stays
> required; ownership proof is waived until OTP is re-enabled.

During development and test:

- use a fake OTP provider,
- never send real SMS by default,
- fake OTP behavior must be impossible to enable accidentally in production,
- test OTP values must come from non-production configuration, not scattered constants.

## 3. Guest checkout

A customer does not need an account to place an order.

A guest order must still capture required contact information and use a secure order-access mechanism for post-purchase viewing. Guest access must not expose orders by sequential identifiers alone.

## 4. Staff authentication

Staff accounts use project-managed credentials. Passwords must be hashed with Argon2id. Privileged staff roles require MFA in production according to the security baseline.

Courier credentials are staff credentials and are not customer OTP sessions.

## 5. Sessions

- Web sessions use secure HTTP-only cookies for refresh/session material.
- Mobile refresh credentials are stored in Expo SecureStore / platform secure storage.
- Access tokens are short-lived.
- Refresh tokens rotate and are stored hashed server-side.
- Sessions are individually revocable.

Exact TTLs are defined in `36-SYSTEM_DEFAULTS_BUSINESS_CONFIG.md`.

## 6. Customer account

Registered customers can manage:

- display name,
- phone number state,
- saved addresses,
- default address,
- order history,
- loyalty balance/history,
- notification preferences where implemented,
- active sessions where exposed.

## 7. Address rules

A delivery address is not valid without location coordinates.

Required canonical fields include:

- address ID,
- customer ID where registered,
- label/title,
- recipient name,
- recipient phone,
- latitude,
- longitude,
- country,
- province/city,
- district,
- neighborhood,
- street/address line,
- building number where available,
- floor/apartment optional,
- delivery note optional,
- provider place ID optional,
- normalized address text,
- created/updated timestamps.

## 8. Map interaction

Address creation must require the user to explicitly confirm a location on the map. Typed text alone is insufficient.

The system should:

1. allow map/search positioning,
2. capture coordinates,
3. reverse-geocode useful address components,
4. allow user correction of textual delivery details,
5. check serviceability,
6. persist the final coordinates.

## 9. Serviceability

Serviceability is based primarily on geospatial location, not only neighborhood text.

Neighborhood assignments can be used as an operational management layer, but the canonical delivery eligibility decision may use PostGIS geometry and configured service rules.

## 10. Privacy

Exact location and address data are personal data. Access is restricted to roles and workflows that need it. Courier access should be limited to delivery tasks relevant to that courier.
