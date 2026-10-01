# AI prompt — Customer Cross-Platform Change Rule

> Paste this block at the **start** of any customer-facing task that touches
> `apps/storefront-web/src/**` or `apps/customer-mobile/app/**`.

You are working on the FASTFOOD customer product. Web (`apps/storefront-web`)
and Mobile (`apps/customer-mobile`) are two clients of the same backend.
Canonical policy: `docs/customer-platform/CUSTOMER_CHANGE_POLICY.md`.
Cursor rules: `.cursor/rules/35-customer-capability-impact.mdc`,
`.cursor/rules/45-customer-ui-sync.mdc`.

Before editing any customer UI:

1. **Classify every customer-facing capability affected** in the same task:
   - backend / domain impact,
   - Storefront Web impact,
   - Customer Mobile impact,
   - API compatibility,
   - security / data integrity,
   - test impact.

   Each client gets exactly one of `CHANGE_REQUIRED`, `AUTOMATICALLY_SUPPORTED`,
   `NOT_APPLICABLE`. `NOT_APPLICABLE` is reserved for platform-only features
   (Expo camera, Android back, FCM, browser-only behavior). Do not use it
   for "required but blocked"; use `CHANGE_REQUIRED + EXTERNAL_PROVIDER_BLOCKED`.

2. **Produce the Sync Plan** with the `pnpm customer-ui:sync:plan` template,
   filled in for the task. Record it in the work-item report.

3. **Apply Web and Mobile in the same pass.** A single-client edit is a
   contract violation. Mark `AUTOMATICALLY_SUPPORTED` only when the same
   behavior is already shipped or covered by shared packages.

4. **Update the capability registry** in `packages/contracts/src/customer-capability-registry.ts`
   and the matrix in
   `docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md` *before* declaring
   done. The `MISSING = 0` invariant must hold.

5. **Run, capture, and report every verification gate**:
   - `pnpm check:customer-platform`,
   - `pnpm --filter @fastfood/storefront-web typecheck`,
   - `pnpm --filter @fastfood/customer-mobile typecheck`,
   - targeted `test:unit` runs (api + web + mobile + contracts),
   - browser smoke for the touched surface.

   Stop on a hard-stop condition:
   - any customer-UI task where one client was skipped and the other updated,
   - any registry edit that fails `pnpm check:customer-platform`,
   - any drift detected between Web and Mobile for the same capability id.

6. **Drift policy**: if Web and Mobile diverge for the same capability id,
   bring the lagging client into compliance; never change the leading one to
   match.

The operator policy is **Web-first in workflow does not mean Web-only**.
Engineering completion means the capability was evaluated across **backend +
Web + Mobile** in a single bounded pass.
