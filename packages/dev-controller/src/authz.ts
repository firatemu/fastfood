import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  PROJECT_STATUS_HUMAN_FIELDS,
  failResult,
  type ControllerResult,
  type ProjectStatusHumanField,
} from './schema.js';

/**
 * Phase-agnostic project-status view.
 *
 * The controller no longer hard-codes `phase0Status`, `phase1Authorization`,
 * `phase3Authorization`, etc. for every future phase. It reads a generic
 * list of phase records parsed from PROJECT_STATUS.md:
 *
 *   | **Phase N**                      | `<technical status>` |
 *   | **Phase N authorization**         | `<AUTHORIZED|NOT AUTHORIZED>` |
 *   | **Phase N human acceptance**     | `<PASS|DEFERRED|...>` |
 *   | **Phase N ready for next phase** | `<YES|NO>` |
 *
 * The historical `phase0Status` / `phase0HumanAcceptance` / `phase1Status` /
 * `phase1Authorization` / `phase2Status` / `phase2Authorization` /
 * `phase3Status` / `phase3Authorization` fields are preserved on the view
 * for backward compatibility with existing parser tests; they are
 * populated by the same generic parser.
 *
 * The controller also reads three project-level fields:
 *
 *   | **Project autonomous execution**           | `<AUTHORIZED|NOT AUTHORIZED>` |
 *   | **Human acceptance deferred to final gate** | `<YES|NO>` |
 *
 * Project-level `Project autonomous execution = AUTHORIZED` authorizes
 * ALL remaining canonical phases at once (data-driven; no new field per
 * phase). `Deployment = PROHIBITED / DEFERRED` and
 * `Production = NOT ACTIVE` remain hard-gated independently and never
 * change under this project-level authorization.
 */

export interface PhaseRecord {
  /** Canonical phase id, e.g. 'PHASE_0', 'PHASE_3'. */
  id: string;
  /** Numeric index extracted from the id (`PHASE_3` → 3). Undefined for PHASE_0. */
  index: number;
  /** The technical status value from the table (e.g. `ACCEPTED / CLOSED`, `TECHNICALLY COMPLETE`, `NOT STARTED`). */
  status: string | null;
  /** The authorization value (`AUTHORIZED` / `NOT AUTHORIZED` / null when absent). */
  authorization: string | null;
  /** The human-acceptance value (`PASS` / `DEFERRED_UNTIL_PROJECT_COMPLETION` / etc.). */
  humanAcceptance: string | null;
  /** The ready-for-next-phase value (`YES` / `NO`). */
  readyForNextPhase: string | null;
  /** The raw row label exactly as it appears in PROJECT_STATUS.md (e.g. `**Phase 3**`). */
  rawLabel: string;
}

export interface ProjectStatusView {
  rawPath: string;
  executionMode: string | null;
  deployment: string | null;
  production: string | null;
  /** When true, the human owner has authorized full-project autonomous development execution. */
  projectAutonomousExecutionAuthorized: boolean;
  /** When true, human testing / acceptance is deferred until final technical completion. */
  humanAcceptanceDeferred: boolean;
  /** Ordered list of phases parsed from PROJECT_STATUS.md. */
  phases: PhaseRecord[];
  /** The last row labeled `**Phase N**` (without `authorization`/`human acceptance`/`ready for next phase`). Used as the "current canonical phase" indicator. */
  currentCanonicalPhase: string | null;
  /** Convenience: phase0Status / phase0HumanAcceptance (legacy fields, still populated). */
  phase0Status: string | null;
  phase0HumanAcceptance: string | null;
  /** Convenience: phase1Status / phase1Authorization (legacy). */
  phase1Status: string | null;
  phase1Authorization: string | null;
  /** Convenience: phase2Status / phase2Authorization (legacy). */
  phase2Status: string | null;
  phase2Authorization: string | null;
  /** Convenience: phase3Status / phase3Authorization (legacy). */
  phase3Status: string | null;
  phase3Authorization: string | null;
  /** Aggregate human-acceptance value if a `**Human acceptance**` row exists. */
  humanAcceptance: string | null;
  autonomousExecution: string | null;
  nextAuthorizedTask: string | null;
  autonomousController: string | null;
  fatal: string | null;
}

const HEADER_PATTERN = /^\|\s*\*\*([^*]+)\*\*\s*\|\s*`([^`]+)`\s*\|\s*$/;

/**
 * Normalize a row label. Recognizes:
 *   "current mode" / "execution mode"      → executionMode
 *   "deployment"                          → deployment
 *   "production"                          → production
 *   "human acceptance"                    → humanAcceptance
 *   "autonomous execution"                → autonomousExecution
 *   "next authorized repository task" /
 *     "next authorized task"              → nextAuthorizedTask
 *   "autonomous controller"               → autonomousController
 *   "project autonomous execution" /
 *     "project autonomous execution authorized" → projectAutonomousExecution
 *   "human acceptance deferred to final gate" /
 *     "human acceptance deferred"         → humanAcceptanceDeferred
 *   "phase <N> status" / "phase <N>" /
 *     "phase <N> technical status"        → phase.<N>.status
 *   "phase <N> authorization"             → phase.<N>.authorization
 *   "phase <N> human acceptance"          → phase.<N>.humanAcceptance
 *   "phase <N> ready for next phase"      → phase.<N>.readyForNextPhase
 *   "phase <N> <other>"                   → ignored (no specific field; future-proof)
 *
 * Returns null for unrecognised keys.
 */
type NormalizedKey =
  | { kind: 'flat'; flat: string }
  | {
      kind: 'phase';
      phaseIndex: number;
      phaseField: 'status' | 'authorization' | 'humanAcceptance' | 'readyForNextPhase';
    };

function normalizeKey(rawKey: string): NormalizedKey | null {
  const k = rawKey.trim().toLowerCase().replace(/\s+/g, '');

  // Flat (non-phase) fields.
  if (k === 'currentmode' || k === 'executionmode') return { kind: 'flat', flat: 'executionMode' };
  if (k === 'deployment') return { kind: 'flat', flat: 'deployment' };
  if (k === 'production') return { kind: 'flat', flat: 'production' };
  if (k === 'humanacceptance') return { kind: 'flat', flat: 'humanAcceptance' };
  if (k === 'autonomousexecution') return { kind: 'flat', flat: 'autonomousExecution' };
  if (k === 'nextauthorizedrepositorytask' || k === 'nextauthorizedtask') {
    return { kind: 'flat', flat: 'nextAuthorizedTask' };
  }
  if (k === 'autonomouscontroller') return { kind: 'flat', flat: 'autonomousController' };
  if (
    k === 'projectautonomousexecution' ||
    k === 'projectautonomousexecutionauthorized' ||
    k === 'fullcanonicalprojectautonomousexecution'
  ) {
    return { kind: 'flat', flat: 'projectAutonomousExecutionAuthorized' };
  }
  if (k === 'humanacceptancedeferredtofinalgate' || k === 'humanacceptancedeferred') {
    return { kind: 'flat', flat: 'humanAcceptanceDeferred' };
  }

  // Phase rows.
  const m = /^phase(\d+)(.*)$/.exec(k);
  if (!m) return null;
  const phaseIdx = Number(m[1]);
  if (!Number.isFinite(phaseIdx)) return null;
  const suffix = (m[2] ?? '').replace(/^[\s.]+/, '');
  if (suffix === '' || suffix === 'status' || suffix === 'technicalstatus') {
    return { kind: 'phase', phaseIndex: phaseIdx, phaseField: 'status' };
  }
  if (suffix === 'authorization') {
    return { kind: 'phase', phaseIndex: phaseIdx, phaseField: 'authorization' };
  }
  if (suffix === 'humanacceptance') {
    return { kind: 'phase', phaseIndex: phaseIdx, phaseField: 'humanAcceptance' };
  }
  if (suffix === 'readyfornextphase') {
    return { kind: 'phase', phaseIndex: phaseIdx, phaseField: 'readyForNextPhase' };
  }
  // Phase N <other> rows: still recognised as belonging to phase N so we
  // remember them, but mapped to status field if no specific match.
  return { kind: 'phase', phaseIndex: phaseIdx, phaseField: 'status' };
}

function getOrCreatePhaseRecord(
  view: ProjectStatusView,
  phaseIndex: number,
  rawLabel: string,
): PhaseRecord {
  let rec = view.phases.find((p) => p.index === phaseIndex);
  if (!rec) {
    rec = {
      id: phaseIndex === 0 ? 'PHASE_0' : `PHASE_${phaseIndex}`,
      index: phaseIndex,
      status: null,
      authorization: null,
      humanAcceptance: null,
      readyForNextPhase: null,
      rawLabel,
    };
    view.phases.push(rec);
    view.phases.sort((a, b) => a.index - b.index);
  }
  return rec;
}

export function parseProjectStatusView(raw: string): ProjectStatusView {
  const view: ProjectStatusView = {
    rawPath: '',
    executionMode: null,
    deployment: null,
    production: null,
    projectAutonomousExecutionAuthorized: false,
    humanAcceptanceDeferred: false,
    phases: [],
    currentCanonicalPhase: null,
    phase0Status: null,
    phase0HumanAcceptance: null,
    phase1Status: null,
    phase1Authorization: null,
    phase2Status: null,
    phase2Authorization: null,
    phase3Status: null,
    phase3Authorization: null,
    humanAcceptance: null,
    autonomousExecution: null,
    nextAuthorizedTask: null,
    autonomousController: null,
    fatal: null,
  };
  for (const line of raw.split('\n')) {
    const m = HEADER_PATTERN.exec(line);
    if (!m) continue;
    const rawKey = m[1];
    const rawValue = m[2];
    if (rawKey === undefined || rawValue === undefined) continue;
    const key = normalizeKey(rawKey);
    if (key === null) continue;
    if (key.kind === 'flat') {
      const field = key.flat;
      // Boolean coercion for the two boolean fields.
      if (field === 'projectAutonomousExecutionAuthorized') {
        (view as unknown as Record<string, unknown>)[field] =
          /^(AUTHORIZED|YES|TRUE|FULL_PROJECT_AUTONOMOUS_EXECUTION_AUTHORIZED)$/i.test(rawValue);
        continue;
      }
      if (field === 'humanAcceptanceDeferred') {
        (view as unknown as Record<string, unknown>)[field] =
          /^(YES|TRUE|DEFERRED|DEFERRED_UNTIL_FULL_TECHNICAL_COMPLETION|DEFERRED_UNTIL_PROJECT_COMPLETION)$/i.test(
            rawValue,
          );
        continue;
      }
      (view as unknown as Record<string, unknown>)[field] = rawValue;
      continue;
    }
    // Phase record.
    const phaseIndex = key.phaseIndex;
    const phaseField = key.phaseField;
    const rec = getOrCreatePhaseRecord(view, phaseIndex, rawKey);
    if (phaseField === 'status') {
      // The first generic `Phase N` row becomes the current canonical phase indicator.
      if (view.currentCanonicalPhase === null || rec.status === null) {
        view.currentCanonicalPhase = rec.id;
      }
      rec.status = rawValue;
      // Mirror to legacy convenience fields.
      if (phaseIndex === 0) view.phase0Status = rawValue;
      if (phaseIndex === 1) view.phase1Status = rawValue;
      if (phaseIndex === 2) view.phase2Status = rawValue;
      if (phaseIndex === 3) view.phase3Status = rawValue;
    } else if (phaseField === 'authorization') {
      rec.authorization = rawValue;
      if (phaseIndex === 1) view.phase1Authorization = rawValue;
      if (phaseIndex === 2) view.phase2Authorization = rawValue;
      if (phaseIndex === 3) view.phase3Authorization = rawValue;
    } else if (phaseField === 'humanAcceptance') {
      rec.humanAcceptance = rawValue;
      if (phaseIndex === 0) view.phase0HumanAcceptance = rawValue;
    } else if (phaseField === 'readyForNextPhase') {
      rec.readyForNextPhase = rawValue;
    }
  }
  return view;
}

export function findRepoRoot(): string | null {
  return path.resolve(process.cwd(), '..', '..');
}

function emptyView(): ProjectStatusView {
  return {
    rawPath: '',
    executionMode: null,
    deployment: null,
    production: null,
    projectAutonomousExecutionAuthorized: false,
    humanAcceptanceDeferred: false,
    phases: [],
    currentCanonicalPhase: null,
    phase0Status: null,
    phase0HumanAcceptance: null,
    phase1Status: null,
    phase1Authorization: null,
    phase2Status: null,
    phase2Authorization: null,
    phase3Status: null,
    phase3Authorization: null,
    humanAcceptance: null,
    autonomousExecution: null,
    nextAuthorizedTask: null,
    autonomousController: null,
    fatal: null,
  };
}

export async function loadProjectStatusView(
  repoRoot: string = findRepoRoot() ?? process.cwd(),
): Promise<ProjectStatusView> {
  const p = path.join(repoRoot, 'PROJECT_STATUS.md');
  const view = { ...emptyView(), rawPath: p };
  if (!existsSync(p)) {
    return { ...view, fatal: `PROJECT_STATUS.md not found at ${p}` };
  }
  const raw = await readFile(p, 'utf8');
  return { ...parseProjectStatusView(raw), rawPath: p };
}

/**
 * Phase-agnostic authorization check.
 *
 * Authorization precedence:
 *   1. PROJECT_AUTONOMOUS_EXECUTION = AUTHORIZED at the table level
 *      authorizes EVERY phase (data-driven) — EXCEPT PHASE_1 which
 *      remains explicitly NOT AUTHORIZED until separately unlocked, AND
 *      PHASE_DEPLOYMENT / PHASE_RELEASE which never authorize.
 *   2. Per-phase `<N> authorization = AUTHORIZED` row still works
 *      (legacy / explicit per-phase grant).
 *   3. PHASE_0 is authorized when `Phase 0 status = ACCEPTED / CLOSED`
 *      and `Phase 0 human acceptance = PASS`.
 *
 * Returns `{ ok: true, source: 'PROJECT_AUTONOMOUS_EXECUTION' | 'PHASE_AUTHORIZATION' | 'PHASE_0_CLOSURE' }`
 * for positive results.
 */
export function isPhaseAuthorized(
  view: ProjectStatusView,
  phase: string,
): ControllerResult & {
  source?: 'PROJECT_AUTONOMOUS_EXECUTION' | 'PHASE_AUTHORIZATION' | 'PHASE_0_CLOSURE';
} {
  if (view.fatal) {
    return failResult('AUTHORIZATION_FAILURE', `cannot read PROJECT_STATUS.md: ${view.fatal}`);
  }
  // Hard exclusions — never authorize regardless of project-level flags.
  const normalized = phase.toUpperCase();
  if (
    normalized === 'PHASE_DEPLOYMENT' ||
    normalized === 'PHASE_RELEASE' ||
    normalized === 'PHASE_PRODUCTION' ||
    normalized === 'AUTONOMOUS_ARM'
  ) {
    return failResult(
      'AUTHORIZATION_FAILURE',
      `phase ${phase} is NEVER authorized by any project-level flag (deployment / release gates)`,
    );
  }

  // Numeric PHASE_N match comes FIRST so PHASE_10 / PHASE_11..PHASE_19 are
  // not accidentally matched by the PHASE_1 startsWith check below.
  const phaseNumMatch = /^PHASE_(\d+)$/.exec(normalized);
  if (phaseNumMatch) {
    const idx = Number(phaseNumMatch[1]);
    const phases = view.phases ?? [];
    const rec = phases.find((p) => p.index === idx);
    if (rec?.authorization === 'AUTHORIZED') {
      return {
        ok: true,
        code: 'OK',
        message: `phase ${phase} is AUTHORIZED in PROJECT_STATUS.md`,
        source: 'PHASE_AUTHORIZATION',
      };
    }
    // Legacy fallback for indices 0..3 (backward compat with old
    // synthetic views that haven't migrated to the generic phases array).
    if (idx === 0) {
      if (view.phase0Status === 'ACCEPTED / CLOSED' && view.phase0HumanAcceptance === 'PASS') {
        return {
          ok: true,
          code: 'OK',
          message: 'phase PHASE_0 is authorized (closed)',
          source: 'PHASE_0_CLOSURE',
        };
      }
      return failResult(
        'AUTHORIZATION_FAILURE',
        'phase PHASE_0 is not recorded as ACCEPTED/CLOSED in PROJECT_STATUS.md',
      );
    }
    if (idx === 1) {
      if (view.phase1Authorization === 'AUTHORIZED') {
        return {
          ok: true,
          code: 'OK',
          message: `phase ${phase} is AUTHORIZED via legacy Phase 1 authorization field`,
          source: 'PHASE_AUTHORIZATION',
        };
      }
      return failResult(
        'AUTHORIZATION_FAILURE',
        `phase ${phase} is NOT AUTHORIZED in PROJECT_STATUS.md (closed status only marks completion, not new authorization)`,
      );
    }
    if (idx === 2 && view.phase2Authorization === 'AUTHORIZED') {
      return {
        ok: true,
        code: 'OK',
        message: `phase ${phase} is AUTHORIZED via legacy Phase 2 authorization field`,
        source: 'PHASE_AUTHORIZATION',
      };
    }
    if (idx === 3 && view.phase3Authorization === 'AUTHORIZED') {
      return {
        ok: true,
        code: 'OK',
        message: `phase ${phase} is AUTHORIZED via legacy Phase 3 authorization field`,
        source: 'PHASE_AUTHORIZATION',
      };
    }
    // Project-level autonomous execution authorizes this phase
    // unless it has an explicit NOT AUTHORIZED row.
    if (view.projectAutonomousExecutionAuthorized) {
      if (rec?.authorization === 'NOT AUTHORIZED') {
        return failResult(
          'AUTHORIZATION_FAILURE',
          `phase ${phase} is explicitly NOT AUTHORIZED even under project-level autonomous execution`,
        );
      }
      return {
        ok: true,
        code: 'OK',
        message: `phase ${phase} is authorized via FULL_PROJECT_AUTONOMOUS_EXECUTION`,
        source: 'PROJECT_AUTONOMOUS_EXECUTION',
      };
    }
    return failResult(
      'AUTHORIZATION_FAILURE',
      `phase ${phase} is not authorized (no per-phase row, no project-level autonomous execution)`,
    );
  }

  return failResult(
    'AUTHORIZATION_FAILURE',
    `phase ${phase} is not a recognized canonical phase id`,
  );
}

/**
 * Returns the next canonical phase id that should run AFTER `phase` based
 * on the ordered `phases` array. Returns null if there is no next phase
 * recorded (the agent must then hard-stop for the final project gate).
 */
export function nextCanonicalPhaseAfter(view: ProjectStatusView, phase: string): string | null {
  const normalized = phase.toUpperCase();
  const phaseMatch = /^PHASE_(\d+)/.exec(normalized);
  if (!phaseMatch) return null;
  const idx = Number(phaseMatch[1]);
  const sorted = [...view.phases].sort((a, b) => a.index - b.index);
  const next = sorted.find((p) => p.index > idx);
  return next ? next.id : null;
}

export function isHumanOwnedField(name: string): name is ProjectStatusHumanField {
  return (PROJECT_STATUS_HUMAN_FIELDS as readonly string[]).includes(name);
}
