/**
 * Public surface of @fastfood/dev-controller.
 *
 * IMPORTANT: This package must NEVER become a runtime dependency of any
 * application or shared business package. It is development tooling only.
 *
 * The CLI entrypoint (`src/cli.ts`) is consumed by:
 *   - root `pnpm controller:*` scripts in package.json
 *   - Cursor (active AI coding environment) / human owner direct invocation
 */
export { run as runControllerCli } from './cli.js';
export type { ControllerResult, Evidence, FailureClass } from './schema.js';
export { WorkItemStates, FailureClasses, EvidenceResults } from './schema.js';
export { isTransitionAllowed, nextStateAfterFailure } from './state.js';
