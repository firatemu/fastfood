# @fastfood/dev-controller

Repository-native autonomous development controller.

- NOT a runtime dependency of any app or shared package.
- NOT armable from inside itself — arming requires an explicit human-owner
  authorization recorded in `PROJECT_STATUS.md`.
- NOT a deploy/release automation.
- NOT a process supervisor or daemon. Every controller invocation is bounded.

See `fastfood-project-docs/50-AUTONOMOUS_DEVELOPMENT_CONTROLLER.md` for the
canonical specification.

This package is consumed by:

- root `pnpm controller:*` scripts in `package.json` (developer-tooling
  orchestration),
- Cursor (active AI coding environment) / human owner direct invocation.

CLI entrypoint: `src/cli.ts`.

Local runtime state lives under `.fastfood-controller/` (gitignored).
