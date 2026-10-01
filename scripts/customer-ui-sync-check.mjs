#!/usr/bin/env node
/**
 * Print the Customer UI Sync Plan template for a planned change.
 *
 * Usage:
 *   node scripts/customer-ui-sync-check.mjs "<short capability name>"
 *   # e.g.
 *   node scripts/customer-ui-sync-check.mjs "phone+password login"
 *
 * The output is markdown that the agent fills in BEFORE touching
 * `apps/storefront-web/src` or `apps/customer-mobile/app`. See
 * `.cursor/rules/45-customer-ui-sync.mdc` for the full contract.
 */
const cap = process.argv.slice(2).join(' ') || '<capability name>';

const out = `# Customer UI Sync Plan — ${cap}

> Required by \`.cursor/rules/45-customer-ui-sync.mdc\`. Fill in before editing.

## 1. Capability affected

- [ ] \`packages/contracts/src/customer-capability-registry.ts\` row(s):

## 2. Web surface (\`apps/storefront-web/src/**\`)

- [ ]

## 3. Mobile surface (\`apps/customer-mobile/app/**\`, \`components/**\`, \`lib/**\`)

- [ ]

## 4. Shared contracts

- [ ] \`packages/contracts/**\`
- [ ] \`packages/api-client/**\`

## 5. Capability registry move

| Field        | Before          | After            |
|--------------|-----------------|------------------|
| webImpact    |                 |                  |
| webStatus    |                 |                  |
| mobileImpact |                 |                  |
| mobileStatus |                 |                  |

## 6. Verification gates (must all be green)

- [ ] \`pnpm check:customer-platform\`
- [ ] \`pnpm --filter @fastfood/storefront-web typecheck\`
- [ ] \`pnpm --filter @fastfood/customer-mobile typecheck\`
- [ ] Targeted \`test:unit\` for touched packages
- [ ] Browser smoke (when UI surface touched)

## 7. Why this is not a single-client change

(Explain in one paragraph why both clients need to move together, or
state which client is \`AUTOMATICALLY_SUPPORTED\` and why.)
`;

process.stdout.write(out);
