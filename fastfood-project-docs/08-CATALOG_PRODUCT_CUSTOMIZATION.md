# Catalog, Product, Variant, Modifier, and Allergen Model

## 1. Catalog hierarchy

The catalog supports:

- Categories
- Products
- Product media
- Variants
- Modifier groups
- Modifiers
- Removable ingredients
- Allergens
- Product availability rules
- Branch availability overrides

## 2. Product

A product contains customer-facing content and catalog metadata such as:

- name,
- slug,
- short description,
- long description,
- category assignments,
- images,
- allergens,
- default status,
- sort order,
- base/default presentation data.

## 3. Variant

A variant represents a purchasable base choice that can affect price or configuration.

Example:

- Burger 100 g
- Burger 130 g

A product may require exactly one variant, allow an optional variant, or have no variant group depending on its model.

## 4. Modifier group

A modifier group defines selection constraints:

- title,
- required/optional,
- minimum selection count,
- maximum selection count,
- selection type,
- sort order.

Examples:

- Extra ingredients
- Sauce choice
- Side choice

## 5. Modifier

A modifier may:

- add price,
- add no price,
- be active/inactive,
- be available only for selected products/variants.

## 6. Removable ingredients

Removal choices are modeled explicitly. A customer may remove only ingredients marked removable for that product configuration.

Removing an ingredient does not reduce price unless a future business rule explicitly says so. V1 default: removable ingredients have no negative price effect.

## 7. Allergens

Allergen definitions are centralized. Products reference allergen IDs. Customer-facing allergen text must be treated as informational and maintained accurately by authorized catalog users.

## 8. Media

Products support multiple images with:

- storage key,
- alt text,
- sort order,
- primary-image flag,
- optional metadata.

Original uploads should be retained where storage policy allows; web-optimized derivatives may be generated.

## 9. Availability

Availability is resolved from layered conditions:

1. product active state,
2. variant/modifier active state,
3. branch availability,
4. temporary branch sold-out override,
5. operating rules where relevant.

## 10. Snapshot rule

Order items must preserve a purchase-time snapshot of product names, variant names, modifier names, quantities, and monetary values. Historical orders must not change when the catalog later changes.
