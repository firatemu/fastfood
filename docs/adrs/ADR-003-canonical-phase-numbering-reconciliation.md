# ADR-003: Canonical Phase Numbering Reconciliation

- **Status:** Accepted
- **Date:** 2026-09-17
- **Decision owners:** Human owner; implementation agent records
- **Supersedes:** none
- **Superseded by:** none
- **Related artifacts:**
  - `fastfood-project-docs/23-ROADMAP_PHASES_DEFINITION_OF_DONE.md`
  - `fastfood-project-docs/46-CHANGE_CONTROL_ADR_PROTOCOL.md`
  - `PROJECT_STATUS.md`

## Context

The canonical roadmap `fastfood-project-docs/23-ROADMAP_PHASES_DEFINITION_OF_DONE.md`
defines:

- **Phase 0** = Documentation and implementation lock
- **Phase 1** = Repository foundation
- **Phase 2** = Design system

The original bootstrap execution prompt titled its mission "Phase 0:
Repository Bootstrap and Foundation" and instructed the agent to bootstrap the
canonical Phase 1 repository foundation work under that historical label.

The implementation, completion, remediation, evidence, and human
acceptance reports all inherited that historical label. The human
owner explicitly accepted the foundation work as "Phase 0". The
canonical roadmap itself was never changed.

A repository audit confirmed the drift and proposed three options. The human
owner reviewed the audit and selected **Option A** (restore canonical roadmap
numbering) as the reconciliation. The intermediate audit was archived after
this accepted ADR became the durable decision record.

Per document 46 (`46-CHANGE_CONTROL_ADR_PROTOCOL.md`), this is a
material governance contract change and therefore requires an ADR.

## Decision

Restore and preserve the canonical numbering defined by document 23
as authoritative. The previously accepted foundation work is
semantically attached to canonical Phase 1 (Repository Foundation),
not to canonical Phase 0 (Documentation and Implementation Lock).

Canonical Phase 0 is closed because the documentation set is approved,
the open business decisions are listed, the toolchain / version matrix
is locked, the design tokens are locked, the pricing formula is locked,
the auth/authorization contract is locked, and the database
conventions are locked — all of which are visible in
`fastfood-project-docs/`.

Canonical Phase 1 is closed because the repository foundation work
(formerly labeled "Phase 0 Repository Bootstrap and Foundation") has
been technically completed, remediated, human validated, and human
accepted.

Canonical Phase 2 becomes the next implementation phase and remains
`NOT STARTED` / `NOT AUTHORIZED`. No new implementation phase is
authorized by this ADR.

## Canonical mapping

| Historical label                                     | Canonical interpretation                         |
| ---------------------------------------------------- | ------------------------------------------------ |
| Phase 0 Repository Bootstrap / Foundation            | Canonical Phase 1 — Repository Foundation        |
| "Phase 0 = ACCEPTED / CLOSED" in earlier status rows | Canonical Phase 1 = ACCEPTED / CLOSED            |
| "Phase 1 = NOT STARTED" in earlier status rows       | Canonical Phase 2 = NOT STARTED                  |
| "Phase 1 authorization = NOT AUTHORIZED"             | Canonical Phase 2 authorization = NOT AUTHORIZED |

The canonical roadmap numbering remains unchanged (Phase 0 = docs,
Phase 1 = foundation, Phase 2 = design system, …).

## Acceptance preservation

The human owner's Phase 0 acceptance was made against the prompt
that labeled the foundation work as Phase 0. The human owner exercised
six manual checks (H1–H6) on the live foundation and signed off:

- H1 Storefront visual render — PASS
- H2 Admin visual render — PASS
- H3 Storefront theme — PASS
- H4 Operations/Admin theme — PASS
- H5 Storefront responsive behavior — PASS
- H6 Swagger UI usability — PASS

The acceptance was for **observable behavior of the live foundation**,
not for a numeric label. The acceptance is therefore valid for the
foundation regardless of which numbering model is chosen, provided
the reconciliation acknowledges that the accepted foundation work IS
the canonical Phase 1 of document 23.

The foundation work MUST NOT be repeated. Its acceptance MUST NOT be
invalidated. Historical evidence MUST remain intact.

## Consequences

- Canonical Phase 0 is closed (meaning: documentation lock).
- Canonical Phase 1 is closed (meaning: repository foundation
  accepted).
- Canonical Phase 2 becomes the next implementation phase (meaning:
  the design system), and remains `NOT STARTED` /
  `NOT AUTHORIZED`.
- `PROJECT_STATUS.md` is re-labeled to represent canonical numbering.
  Human-owned authorization fields are NOT modified beyond the
  factual re-labeling.
- Historical artifacts remain unchanged.
- The Autonomous Development Controller's invariant that phase
  identifiers are data-driven is preserved; no controller logic
  change is required. Phase 2 manifests will be rejected by
  `isPhaseAuthorized` because Phase 2 has no authorization row yet.
- Future manifests use canonical roadmap phase identifiers
  (`PHASE_0`, `PHASE_1`, `PHASE_2`, …).
- The bootstrap prompt and reconciliation audit are historical inputs. They
  were removed from the active documentation tree after this ADR and
  `PROJECT_STATUS.md` became self-contained.

## Rejected alternatives

The reconciliation audit proposed two alternative options. Both were
considered and rejected.

### Option B — Adopt current execution numbering

This option would have renumbered every future phase down by one
(Phase 2 → "Phase 1", etc.) by rewriting the canonical roadmap and
every dependent contract to absorb the foundation work into Phase 0
and treat Phase 2 as the new "Phase 1".

Rejected because:

- High blast radius (every contract that referenced "Phase N" would
  need to be audited and reissued, with an ADR per affected contract).
- It invalidates the canonical roadmap as it stands today.
- It does not fix any actual product risk — it only changes numeric
  labels on the same product state.
- The transition window would create a high risk of ambiguity for
  every historical reader.

### Option C — Explicit bootstrap/pre-phase distinction

This option would have introduced a new "BOOTSTRAP_GATE" or
"FOUNDATION_PHASE" meta-phase outside canonical Phase numbering, in
addition to Phase 0 / Phase 1 / Phase 2.

Rejected because:

- It introduces a new concept that is not in the locked contracts and
  therefore requires a separate ADR per document 46.
- It adds a third concept alongside "Phase 0" and "Phase 1",
  increasing cognitive load and the chance of future drift.
- Option A is simpler, honors the existing canonical roadmap, and
  requires no new concepts.

## Implementation summary

This ADR authorizes the following governance-only changes:

1. `PROJECT_STATUS.md` re-labeling (factual rows).
2. `AGENTS.md` is unchanged (it is tool-independent and refers to
   `PROJECT_STATUS.md`).
3. `.cursor/rules/*.mdc` are unchanged (they reference
   `PROJECT_STATUS.md` and document 23 / 49, which themselves remain
   authoritative).
4. `fastfood-project-docs/50-AUTONOMOUS_DEVELOPMENT_CONTROLLER.md` is
   unchanged (it is data-driven and reads `PROJECT_STATUS.md`).
5. Historical prompt/report inputs remain preserved in the 2026-09-21
   documentation-cleanup backup rather than the active AI reading set.
6. `docs/adrs/ADR-003-canonical-phase-numbering-reconciliation.md` (this
   file) is the durable reconciliation record.

No application source is modified. No real Phase 2 controller
runtime state is created. No deployment is performed.
