# 13 — Admin Human QA test data

Local/dev fixtures only. These are **not** production credentials and must not be used outside the developer database.

Source: `apps/api/prisma/seed.ts` after `pnpm db:seed`. Override staff password with `SEED_STAFF_PASSWORD` if set.

## Staff login (development)

| Field | Value |
| --- | --- |
| Email | `staff@fastfood.local` |
| Password | `DevStaffPass1!` (default) |
| Display name | Dev Staff |
| User id | `01900000-0000-7000-8000-00000000a001` |
| Role | HQ Admin (`01900000-0000-7000-8000-00000000b001`) |
| MFA | Local bypass may accept any 6 digits when MFA is required |

## Branch

| Field | Value |
| --- | --- |
| Id | `01900000-0000-7000-8000-faaaaaaaaaaa` |
| Code | `IST-DT` |
| Name | Kadıköy Moda |
| Service area id | `01900000-0000-7000-8000-fbbbbbbbbbbb` |
| Service area name | Downtown core |

Admin default branch constant: `DEFAULT_BRANCH_ID` in `apps/admin-web/src/lib/api.ts`.

## Catalog samples

| Kind | Name | Id |
| --- | --- | --- |
| Category | Burgers | `01900000-0000-7000-8000-aaaaaaaaaaaa` |
| Product | Classic Cheeseburger | `01900000-0000-7000-8000-cccccccccccc` |
| Product | Double Smash Burger | `01900000-0000-7000-8000-c10000000002` |
| Allergen | Gluten | `01900000-0000-7000-8000-dddddddddddd` |
| Allergen | Dairy | `01900000-0000-7000-8000-eeeeeeeeeeee` |

Product editor: `/catalog/products/01900000-0000-7000-8000-cccccccccccc`.

## Courier

| Field | Value |
| --- | --- |
| User id | `01900000-0000-7000-8000-00000000a002` |
| Display name | Dev Courier |
| Role | Courier |

## Orders / payments / customers

Seed does **not** guarantee a standing PAID order, refundable payment, or customer user.

Use whatever rows exist in the local DB after Storefront/Mobile checkout against this API:

- Order ids: `/orders` list (branch-scoped)
- Payment ids: `/payments` list
- Customer ids: `/customers` list or the user id on an order
- Refundable: payment status PAID with remaining balance on detail

If lists are empty, that is an honest empty state — create a local checkout first. Do not invent PAN/CVV.

## Access / system

| Area | Expected local note |
| --- | --- |
| Users | Dev Staff + any later staff |
| Roles | HQ Admin, Courier |
| Audit | Often empty on a fresh seed (no audit rows) |
| Settings | Often empty (`business_setting` not seeded) |

Empty Audit/Settings is a backend/env limitation, not a broken screen.

## Safety

- Do not refund or cancel unless you accept mutating this local DB.
- Do not paste production tokens, gateway secrets, or customer PII into this file.
