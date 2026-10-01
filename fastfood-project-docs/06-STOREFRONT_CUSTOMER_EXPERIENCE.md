# Storefront and Customer Experience

## 1. Customer experience objective

The storefront must look and behave like a high-quality modern food-commerce experience. It is the public face of the brand and must prioritize performance, appetite appeal, clarity, trust, and conversion.

## 2. Storefront information architecture

Required customer-facing web areas:

- Home
- Menu / Categories
- Product listing
- Product detail/customization
- Cart
- Address selection
- Checkout
- Payment handoff/return
- Order confirmation
- Live order tracking
- Login / OTP
- Account
- Saved addresses
- Order history
- Order detail
- Profile settings
- Legal/privacy pages

## 3. Product discovery

The storefront must support:

- category navigation,
- featured products,
- product image,
- name,
- short description,
- starting/current price,
- availability,
- allergen notice where appropriate,
- product badges controlled by data rather than hardcoded UI.

## 4. Product detail/customization

A product detail view must render the canonical product configuration received from the backend.

It may contain:

- image gallery,
- description,
- allergen information,
- variant groups,
- modifier groups,
- removable ingredients,
- required selections,
- quantity,
- calculated display total,
- validation feedback,
- add-to-cart action.

The backend revalidates all selected IDs, quantities, availability, and pricing.

## 5. Cart UX

Users can:

- update quantity,
- remove an item,
- edit customization,
- see product/modifier breakdown,
- see pricing summary,
- see serviceability or branch-related warnings where known,
- proceed to address/checkout.

A cart item represents a configured product snapshot, not just a product ID.

## 6. Checkout sequence

The canonical customer sequence is:

1. Cart review
2. Customer/contact resolution
3. Delivery address selection/creation
4. Serviceability and branch resolution
5. Backend price quote
6. Loyalty selection and reservation intent
7. Payment initialization
8. iyzico flow
9. Server-side payment verification
10. Order confirmation

Payment controls must not be presented before the delivery address and serviceability are resolved.

## 7. Order tracking

Customer-visible status language is mapped from internal states. Customers do not need to see implementation-specific operational statuses.

Example customer phases:

- Order received
- Confirmed by restaurant
- Preparing
- Ready for courier
- Courier picked up
- On the way
- Delivered

## 8. Responsive behavior

The storefront must work from small mobile viewport to large desktop. Critical commerce actions should remain easy to reach on mobile. Product customization and checkout must not depend on hover.

## 9. SEO and performance

Storefront product/category pages should use Next.js server rendering/static capabilities where appropriate, semantic metadata, canonical URLs, structured data where valid, optimized images, and minimal client JavaScript for non-interactive content.

Performance budgets are defined in `24-NONFUNCTIONAL_REQUIREMENTS.md`.
