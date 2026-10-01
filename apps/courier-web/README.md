# FASTFOOD Courier Web

Local browser client for courier delivery work. It uses Next.js 16 and the shared `@fastfood/api-client`, `@fastfood/contracts`, `@fastfood/design-tokens`, and `@fastfood/ui-web` workspaces. The app listens on port `3102`.

## Start locally

From the repository root, install/update the pnpm workspace lockfile, then run:

```bash
pnpm --filter @fastfood/api start:dev
pnpm --filter @fastfood/courier-web dev
```

Open `http://localhost:3102`. The default API base is `http://localhost:4000/api/v1`; override it with `NEXT_PUBLIC_API_BASE_URL` when the local API uses another address. The API's `API_CORS_ORIGINS` must include the exact browser origin `http://localhost:3102` because the web session uses credentialed requests and HttpOnly refresh cookies.

The current seeded local courier is `courier@fastfood.local` / `DevStaffPass1!` (with the local MFA development code when prompted). Never use production credentials in this app.

## Backend relationship map

The UI deliberately uses the courier API projection instead of querying Prisma directly. The relevant schema is in `apps/api/prisma/schema.prisma` and its initial courier migration is `apps/api/prisma/migrations/00000000000007_phase8_courier_delivery/migration.sql`.

```text
User --(userId lookup; courier_profiles.user_id is unique)--> CourierProfile
CourierProfile 1 --- * Delivery                 via deliveries.courier_id
CourierProfile 1 --- * DeliveryAssignment       via delivery_assignments.courier_id
Delivery 1 --- * DeliveryAssignment             via delivery_assignments.delivery_id
Delivery 1 --- * QrClaimToken                    via qr_claim_tokens.delivery_id
CourierProfile 1 --- * CourierLocationPoint      via courier_location_points.courier_id
Delivery 1 --- * CourierLocationPoint            via courier_location_points.delivery_id
Delivery.orderId -> Order id (application-level reference; no FK in courier migration)
Delivery.branchId -> Branch id (application-level reference; no FK in courier migration)
```

`DeliveryAssignment` is the assignment history; the current delivery has its own `courierId` and state. QR records store a token hash, expiry, and claim metadata. Location points are only created through the explicit active-delivery location endpoint. The browser app does not request location permission or send location in the background.

The current courier delivery projection exposes delivery/order IDs, branch ID, recipient fields, address/coordinates, delivery note, status, timestamps, and assignment history. It does not currently expose a branch display name or order-item summary. The UI therefore shows a short order reference and only fields returned by that projection; it does not infer related order/customer data.

## Screens and API ownership

- Sign-in and MFA: `/auth/staff/login`, `/auth/staff/mfa/verify`
- Session rotation and logout: `/auth/staff/refresh`, `/auth/staff/logout`
- Active/history deliveries and details: `/courier/deliveries`, `/courier/deliveries/:deliveryId`
- QR claim: `/courier/claims/qr`
- Server-authorized lifecycle: `pickup` → `on-the-way` → `deliver`
- Navigation URL: `/courier/deliveries/:deliveryId/navigation`
- Courier performance: `/courier/me/performance`

The API enforces courier identity, delivery ownership, and allowed state transitions. Refresh tokens are held in host-only HttpOnly cookies; access tokens exist in memory only. Browser sessions require an exact configured CORS origin. Google Maps navigation is opened from the API-returned URL only when the delivery contains coordinates.
