# FASTFOOD — Comprehensive QA & Human Testing Guide

> **Scope:** Consolidated reference for QA engineers, developers, and product owners conducting local validation, end-to-end testing, or human acceptance.  
> **Environment:** Local Development / Docker Compose / Sandbox Providers.  
> **Rule:** Never use production credentials. Never perform live deployments from this guide.

---

## 1. Local Development Stack Bring-Up

Run the following commands in the monorepo root:

```bash
# 1. Start database, Redis, MinIO infrastructure
pnpm infra:up

# 2. Run migrations and populate test seed data
pnpm db:migrate:deploy
pnpm db:seed

# 3. Start API backend (port 4000)
pnpm dev:api

# 4. Start frontend applications
pnpm dev:storefront   # Customer Web:  http://localhost:3100
pnpm dev:admin        # Admin Web:     http://localhost:3101
pnpm dev:qr:watch     # QR Menu:       http://localhost:3104
```

---

## 2. Seed Test Credentials & Accounts

### 2.1 Staff & Admin Accounts

| Role                 | Email                    | Password           | Display Name | User ID                                |
| -------------------- | ------------------------ | ------------------ | ------------ | -------------------------------------- |
| **Super Admin / HQ** | `staff@fastfood.local`   | `DevStaffPass1!`   | Dev Staff    | `01900000-0000-7000-8000-00000000a001` |
| **Courier Staff**    | `courier@fastfood.local` | `DevCourierPass1!` | Dev Courier  | `01900000-0000-7000-8000-00000000a002` |

> _MFA note:_ In local development, the MFA verification screen accepts any 6-digit code (e.g. `123456`).

### 2.2 Customer Account & OTP Authentication

| Parameter                 | Development Value                           | Notes                                                                             |
| ------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| **Phone Registration**    | Any Turkish phone (`+905551234567`)         | Registered with Phone + Password + KVKK consent.                                  |
| **SMS OTP Verification**  | Fixed Code: `000000`                        | Mock OTP provider in local `.env` (`OTP_PROVIDER=fake`). Never logged to console. |
| **Password Registration** | Unique local password (e.g. `TestPass123!`) | Argon2id encrypted.                                                               |

### 2.3 Branches & Catalog Reference

| Entity               | Name         | Code / ID                                         | Details                                                   |
| -------------------- | ------------ | ------------------------------------------------- | --------------------------------------------------------- |
| **Primary Branch**   | Kadıköy Moda | `IST-DT` / `01900000-0000-7000-8000-faaaaaaaaaaa` | Delivery (max 10 km) + Pickup. Active orders enabled.     |
| **Secondary Branch** | Beşiktaş     | `IST-BES`                                         | Pickup-only (Delivery disabled for out-of-service tests). |
| **Primary Category** | Burgers      | `01900000-0000-7000-8000-aaaaaaaaaaaa`            | Classic Cheeseburger, Double Smash, etc.                  |

### 2.4 Active Promotions

| Promo Code      | Discount Type                   | Criteria                                                    |
| --------------- | ------------------------------- | ----------------------------------------------------------- |
| `BHCLUBWELCOME` | 50.00 TL Fixed Cart Discount    | First order only; automatically eligible for new customers. |
| `BURGERLOVER`   | 10% Cart Discount               | General public promotion.                                   |
| `ATESKARGO`     | Free Delivery (100% Fee Waiver) | Applies to delivery fee on eligible orders.                 |

### 2.5 iyzico Sandbox Payment Credentials

| Field                  | Sandbox Test Value                      |
| ---------------------- | --------------------------------------- |
| **Test Card Number**   | `5528 7900 0000 0008` (3D Secure valid) |
| **Expiration Date**    | `12/30` (any future month/year)         |
| **CVC**                | `123`                                   |
| **3D Secure SMS Code** | `283126` (iyzico standard test OTP)     |

---

## 3. End-to-End Testing Scenarios & Checklists

### 3.1 Scenario 1: Customer Order & Checkout (Storefront / Mobile)

- [ ] **Address Registration:** Open `http://localhost:3100/account/addresses`, drop a pin on the map within 10 km of Kadıköy Moda, fill address lines, and save.
- [ ] **Default Address Toggle:** Ensure the "Varsayılan adres" switch toggles correctly and saves on update.
- [ ] **Cart Flow:** Add a Classic Cheeseburger to cart, select modifiers (extra cheddar, no pickles).
- [ ] **Checkout Validation:** Apply promo code `BURGERLOVER`. Verify quote calculation, delivery fee, and discount lines.
- [ ] **10 km Service Radius Guard:** Select an address > 10 km away; confirm the system blocks delivery checkout and displays `"Seçtiğiniz adres şubeye 10.0 km'den uzaktır"`.
- [ ] **Payment (iyzico 3DS):** Submit order, complete the iyzico sandbox 3D Secure verification with code `283126`.
- [ ] **Order Tracking:** Verify redirect to order status page; observe initial status `PAID`.

### 3.2 Scenario 2: Kitchen Board & Order Fulfillment (Admin Web)

- [ ] **Login:** Access `http://localhost:3101/login` with `staff@fastfood.local` / `DevStaffPass1!`.
- [ ] **Orders Data Grid:** Open `/orders`. Confirm the new order appears with `PAID` status and real-time SSE badge.
- [ ] **Kitchen Display:** Open `/kitchen`. Confirm order is listed in the "Alındı / Hazırlanacak" column.
- [ ] **Status Advance:** Click "Hazırlanıyor" (`PREPARING`) -> order timer begins.
- [ ] **Ready for Pickup:** Click "Hazır" (`READY_FOR_DELIVERY` or `READY_FOR_PICKUP`).

### 3.3 Scenario 3: Courier Delivery & Tracking (Courier Web)

- [ ] **Courier Portal:** Login as `courier@fastfood.local` at `http://localhost:3102`.
- [ ] **Order Claim:** Accept or scan the assigned order QR. Status transitions to `COURIER_ASSIGNED`.
- [ ] **Pickup:** Mark as picked up (`ON_THE_WAY`).
- [ ] **Live Location:** Confirm GPS coordinates update on customer tracking map.
- [ ] **Delivery Completion:** Submit delivery confirmation; order transitions to `DELIVERED`.

### 3.4 Scenario 4: Branch Management & Map Editing

- [ ] **Branch Listing:** Go to `/branches` in Admin. Click edit on "Kadıköy Moda".
- [ ] **Map Coordinate Selection:** Use the embedded interactive map picker to change location coordinates. Save changes.
- [ ] **Super Admin Exemption:** Verify changes save successfully even if no specific branch manager user is assigned.
