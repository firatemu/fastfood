# Courier, Delivery Tracking, and QR Claim

## 1. Courier application

The courier mobile application is a dedicated Expo/React Native app. The complementary Courier Web client uses Next.js and the same courier-scoped API. Courier users are staff identities with resource-scoped authorization; both clients rely on server-side delivery ownership checks.

The web client may support QR camera scanning where the browser provides a QR `BarcodeDetector`; manual token entry remains available as a fallback. QR claims always use the opaque, short-lived token contract below. Browser clients do not collect courier location automatically.

## 2. Delivery job data

A courier may receive only data needed for assigned/eligible delivery work, including:

- order number,
- pickup branch,
- customer recipient name,
- delivery phone,
- address,
- map coordinates,
- delivery note,
- relevant order summary,
- current delivery state.

Sensitive unrelated customer history is not exposed.

## 3. Assignment modes

- Manual assignment by authorized staff
- Secure QR claim by courier

## 4. QR claim contract

A printed QR must contain or resolve to an opaque/signed claim token. It must not rely on a predictable order ID.

On scan, the backend validates:

- token signature/validity,
- expiry where applicable,
- courier authentication,
- courier active status,
- order eligibility,
- branch/order state,
- current assignment,
- courier active-delivery limit.

The claim operation is atomic. At most one competing claim succeeds.

## 5. Delivery states

Delivery-specific states include:

- `UNASSIGNED`
- `ASSIGNED`
- `PICKED_UP`
- `ON_THE_WAY`
- `DELIVERED`
- `CANCELLED`

Order state and delivery state may be separate records but must remain consistent through application services.

## 6. Pickup

The courier cannot mark pickup before the order is eligible for handoff unless an authorized override path exists.

Pickup records timestamp and courier identity.

## 7. Navigation

The app provides a Google Maps deep link/navigation action using stored coordinates. Address text alone is not the navigation source when coordinates are available.

## 8. Live location

Live location is collected only when:

- courier is authenticated,
- there is an active eligible delivery,
- device permission exists,
- feature/configuration allows it.

Location updates include courier ID, delivery/order reference, timestamp, coordinates, and optional accuracy metadata.

The backend rejects impossible/unauthorized location updates for deliveries not owned by the courier.

## 9. Background location

Background location requires explicit mobile permissions and must follow iOS/Android platform requirements. The app must degrade gracefully if background permission is denied; operational status can still be updated manually.

## 10. Location retention

Raw courier location retention is limited according to `36-SYSTEM_DEFAULTS_BUSINESS_CONFIG.md`. Aggregated delivery metrics may have longer retention.

## 11. Offline behavior

The courier app may cache the current delivery view for resilience, but state transitions must be confirmed by the server. Offline state-change requests may be queued locally only if they carry idempotency keys and are revalidated on reconnect.

## 12. Courier performance

A courier can view own metrics such as:

- completed deliveries,
- average delivery duration where available,
- active deliveries,
- historical delivery list.

Couriers cannot browse other couriers' performance unless separately authorized.
