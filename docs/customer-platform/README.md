# FASTFOOD — Customer Cross-Platform Policy & Sync Foundation

> **Scope:** Unified engineering policy governing cross-platform parity between `apps/storefront-web` and `apps/customer-mobile`.  
> **Authority:** In-task evaluation is mandatory for all customer-facing changes per `AGENTS.md` Rule 4 and `.cursor/rules/45-customer-ui-sync.mdc`.

---

## 1. Core Principle: Web-First is Never Web-Only

Any customer-facing feature, bugfix, or capability change must evaluate **both** clients in the same task:

- `apps/storefront-web` (Next.js)
- `apps/customer-mobile` (React Native / Expo)

Every customer capability change requires classifying both platforms into one of three standard values:

- `AUTOMATICALLY_SUPPORTED`: Existing client architecture or server-driven renderer already supports the change without code edits.
- `CHANGE_REQUIRED`: The client requires an explicit UI, state, or contract code modification.
- `NOT_APPLICABLE`: The feature is intrinsically platform-specific (e.g. native camera QR scanner or browser window popup).

---

## 2. Same-Task Implementation Contract

1. **Simultaneous Delivery:** If a client is classified as `CHANGE_REQUIRED`, it must be implemented in the very same task. Never leave mobile behind unless an external mobile SDK or hardware capability explicitly blocks it.
2. **Platform Native Integrity:** Do not compromise mobile UX by attempting to force web CSS or shared DOM into React Native (ADR-008). Respect platform conventions.
3. **Sync Plan Requirement:** Before editing either `apps/storefront-web/src` or `apps/customer-mobile/app`, produce the Sync Plan via:
   ```bash
   pnpm customer-ui:sync:plan "<capability name>"
   ```
4. **Drift Resolution:** If Web and Mobile diverge on an identical capability ID, always upgrade the lagging client to match the leading client.

---

## 3. Canonical Capability Registry

The live capability inventory is maintained in two synchronized files:

- **Code Registry:** `packages/contracts/src/customer-capability-registry.ts`
- **Documentation Matrix:** `docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md`

Run the automated verification suite after any capability change:

```bash
pnpm check:customer-platform
```

Both clients must maintain `MISSING = 0` status across all registered capabilities.
