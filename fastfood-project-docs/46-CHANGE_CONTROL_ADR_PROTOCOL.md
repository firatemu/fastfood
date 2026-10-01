# Change Control and ADR Protocol

## 1. Purpose

The project is intentionally deterministic. This does not mean decisions can never change. It means changes are explicit, reviewable, and propagated consistently.

## 2. When an ADR is required

Create an Architecture Decision Record for changes such as:

- ORM/database/queue framework,
- monorepo/package manager,
- backend architecture style,
- authentication/session model,
- money representation,
- API paradigm/versioning strategy,
- core design-system architecture,
- major deployment platform change,
- introduction of a new cross-cutting runtime dependency,
- major framework upgrade with behavioral impact,
- breaking domain-state change.

## 3. ADR format

```text
# ADR-NNN: Title
Status: Proposed | Accepted | Superseded
Date:
Decision owners:

## Context
## Decision
## Alternatives considered
## Consequences
## Migration plan
## Documents/code affected
```

## 4. Business rule changes

A business rule change such as loyalty cap or minimum order may not need an architecture ADR if it is already an admin-configurable setting. A change to **how** loyalty is calculated does require specification/test updates and may require ADR if cross-cutting.

## 5. Documentation-first rule

For a locked rule change:

1. update/approve the source document or ADR,
2. update implementation,
3. update migrations/contracts/tests,
4. update generated OpenAPI/docs where relevant.

Do not modify code first and later rewrite docs to justify accidental behavior.

## 6. Superseding decisions

Do not delete historical ADRs. Mark old ADR as superseded and link the new one.

## 7. AI agent behavior

An AI agent cannot approve its own architecture deviation. It may propose an ADR draft when explicitly asked, but locked behavior remains in force until the user/team accepts the change.
