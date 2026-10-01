import { z } from 'zod';

/**
 * Schemas for the Autonomous Development Controller.
 *
 * The controller is the deterministic control plane around AI coding work.
 * State, manifests, evidence and classifications are all machine-readable.
 */

export const SCHEMA_VERSION = 1 as const;
export const CONTROLLER_VERSION = '0.0.0-dev-controller-bootstrap' as const;

/**
 * Allowed work-item states. The FSM is closed (see state.ts).
 *
 * Intermediate phase boundary lands on `READY_FOR_NEXT_PHASE_AUTHORIZATION`.
 * Only the FINAL project human gate uses `HUMAN_REVIEW_REQUIRED`.
 */
export const WorkItemStates = [
  'PENDING',
  'IN_PROGRESS',
  'VERIFYING',
  'REPAIR_REQUIRED',
  'TECHNICALLY_COMPLETE',
  'BLOCKED',
  'READY_FOR_NEXT_PHASE_AUTHORIZATION',
  'HUMAN_REVIEW_REQUIRED',
] as const;
export type WorkItemState = (typeof WorkItemStates)[number];

/**
 * Execution modes recognized by the controller.
 *
 * - `DEVELOPMENT_ONLY_HUMAN_VALIDATION` — historical default. Phase-by-phase
 *   human authorization required. Still supported and gated on
 *   `controllerArmed = false`.
 *
 * - `FULL_PROJECT_AUTONOMOUS_DEVELOPMENT` — authorized once by the human
 *   owner via the `Project autonomous execution` row in
 *   `PROJECT_STATUS.md`. Allows the controller to auto-advance through
 *   all remaining canonical phases without per-phase human authorization.
 *   Deployment / production remain hard-gated independently.
 */
export const ExecutionModes = [
  'DEVELOPMENT_ONLY_HUMAN_VALIDATION',
  'FULL_PROJECT_AUTONOMOUS_DEVELOPMENT',
] as const;
export type ExecutionMode = (typeof ExecutionModes)[number];

/**
 * Allowed failure classifications.
 *
 * The execution agent supplies one of these. The controller does NOT invent
 * classifications via AI inference. Unknown or unsafe values fail closed.
 */
export const FailureClasses = [
  'ROUTINE_IMPLEMENTATION_FAILURE',
  'VERIFICATION_FAILURE',
  'SCOPE_VIOLATION',
  'AUTHORIZATION_FAILURE',
  'CONTRACT_CONFLICT',
  'ARCHITECTURE_DECISION_REQUIRED',
  'DEPENDENCY_APPROVAL_REQUIRED',
  'DESTRUCTIVE_OPERATION_REQUIRED',
  'DEPLOYMENT_OPERATION_BLOCKED',
  'PHASE_BOUNDARY_REACHED',
  'PROJECT_HUMAN_GATE',
  'RETRY_BUDGET_EXHAUSTED',
  'UNKNOWN_UNSAFE_FAILURE',
] as const;
export type FailureClass = (typeof FailureClasses)[number];

/**
 * RETRYABLE failures allow the controller to advance into REPAIR_REQUIRED
 * (subject to retry budget). HARD_STOP failures force BLOCKED or
 * HUMAN_REVIEW_REQUIRED immediately.
 */
export const RETRYABLE_FAILURES: ReadonlySet<FailureClass> = new Set([
  'ROUTINE_IMPLEMENTATION_FAILURE',
  'VERIFICATION_FAILURE',
  'SCOPE_VIOLATION',
]);
export const HARD_STOP_FAILURES: ReadonlySet<FailureClass> = new Set([
  'AUTHORIZATION_FAILURE',
  'CONTRACT_CONFLICT',
  'ARCHITECTURE_DECISION_REQUIRED',
  'DEPENDENCY_APPROVAL_REQUIRED',
  'DESTRUCTIVE_OPERATION_REQUIRED',
  'DEPLOYMENT_OPERATION_BLOCKED',
  'PHASE_BOUNDARY_REACHED',
  'PROJECT_HUMAN_GATE',
  'RETRY_BUDGET_EXHAUSTED',
  'UNKNOWN_UNSAFE_FAILURE',
]);

export const EvidenceResults = ['PASS', 'FAIL', 'NOT_RUN'] as const;
export type EvidenceResult = (typeof EvidenceResults)[number];

/**
 * Command string for a verification gate.
 * Must be a non-empty relative command (no `cd /` etc.).
 */
export const VerificationCommandSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine((s) => !/^\s*cd\s+\//.test(s), 'absolute cd paths are not allowed')
  .refine((s) => !/[\r\n]/.test(s), 'newlines are not allowed in commands');

/**
 * A single verification gate's evidence (small; large logs go to an
 * evidence file referenced by `evidenceFile`).
 */
export const EvidenceSchema = z
  .object({
    command: VerificationCommandSchema,
    startedAt: z.string().datetime({ offset: true }),
    finishedAt: z.string().datetime({ offset: true }),
    exitCode: z.number().int().min(-1).max(255),
    result: z.enum(EvidenceResults),
    summary: z.string().max(1024).optional(),
    evidenceFile: z.string().max(512).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.result === 'PASS' && value.exitCode !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PASS result requires exitCode === 0',
        path: ['exitCode'],
      });
    }
    if (value.result === 'PASS' && value.command.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PASS result requires non-empty command evidence',
        path: ['command'],
      });
    }
  });
export type Evidence = z.infer<typeof EvidenceSchema>;

/**
 * Work-item manifest. Version-controlled.
 *
 * `allowedPaths` and `forbiddenPaths` use repo-relative globs. The
 * default Scope guard treats these as fixed strings (no real FS sandbox
 * inside the controller).
 *
 * `z.strictObject({...})` rejects unknown top-level fields so the
 * machine-readable contract is preserved end to end.
 */
export const ManifestSchema = z
  .strictObject({
    id: z.string().min(1).max(128),
    phase: z.string().min(1).max(64),
    title: z.string().min(1).max(200),
    objective: z.string().min(1).max(2000),
    contractReferences: z.array(z.string().min(1).max(256)).max(64).default([]),
    dependencies: z.array(z.string().min(1).max(128)).max(64).default([]),
    allowedPaths: z.array(z.string().min(1).max(1024)).max(256).default([]),
    forbiddenPaths: z.array(z.string().min(1).max(1024)).max(64).default([]),
    verificationCommands: z.array(VerificationCommandSchema).max(64).default([]),
    maxRepairAttempts: z.number().int().min(0).max(10).default(3),
    requiresHumanAcceptance: z.boolean().default(true),
    status: z.enum(['ACTIVE', 'DEPRECATED']).default('ACTIVE'),
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    notes: z.string().max(4000).optional(),
    evidenceRequirements: z.array(z.string().min(1).max(256)).max(64).optional(),
  })
  .superRefine((m, ctx) => {
    if (m.allowedPaths.length === 0 && m.forbiddenPaths.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'manifest must declare at least one allowedPaths or forbiddenPaths entry (default-deny is forbidden)',
        path: ['allowedPaths'],
      });
    }
  });

export type Manifest = z.infer<typeof ManifestSchema>;

/**
 * Controller runtime state.
 *
 * Stored at .fastfood-controller/state.json (gitignored).
 * Atomically written. No secrets, no PII.
 *
 * `z.strictObject({...})` is required so unknown top-level fields fail
 * validation — otherwise Zod 3 would silently strip them, which would
 * corrupt the machine-readable state contract.
 */
export const PHASE_GATE_KINDS = [
  'TECHNICAL_PHASE_GATE',
  'OWNER_NEXT_PHASE_AUTHORIZATION_GATE',
  'FINAL_PROJECT_HUMAN_GATE',
] as const;
export type PhaseGateKind = (typeof PHASE_GATE_KINDS)[number];

export const RuntimeStateSchema = z
  .strictObject({
    schemaVersion: z.literal(SCHEMA_VERSION),
    controllerVersion: z.string().min(1).max(64),
    executionMode: z.enum(ExecutionModes),
    currentPhase: z.string().min(1).max(64),
    phaseAuthorization: z.enum(['NOT_AUTHORIZED', 'AUTHORIZED']),
    /**
     * `controllerArmed = true` is permitted ONLY when
     * `executionMode = 'FULL_PROJECT_AUTONOMOUS_DEVELOPMENT'` and the
     * human-owner-recorded `Project autonomous execution = AUTHORIZED`
     * row exists. `DEVELOPMENT_ONLY_HUMAN_VALIDATION` mode forces
     * `controllerArmed = false`.
     */
    controllerArmed: z.boolean(),
    currentWorkItemId: z.string().min(1).max(128).nullable(),
    currentWorkItemState: z.enum(WorkItemStates).nullable(),
    attempt: z.number().int().min(0).max(10),
    maxAttempts: z.number().int().min(0).max(10),
    lastTransition: z
      .object({
        at: z.string().datetime({ offset: true }),
        from: z.enum(WorkItemStates).nullable(),
        to: z.enum(WorkItemStates).nullable(),
        reason: z.string().max(512).optional(),
      })
      .nullable(),
    lastFailureClass: z.enum(FailureClasses).nullable(),
    humanGateRequired: z.boolean(),
    /**
     * True when the controller has reached the end of a phase's
     * technical work. Intermediate phases combine this with
     * `phaseGateKind = 'TECHNICAL_PHASE_GATE' / 'OWNER_NEXT_PHASE_AUTHORIZATION_GATE'`
     * and `humanGateRequired = false`. The final project gate uses
     * `phaseGateKind = 'FINAL_PROJECT_HUMAN_GATE'` and may set
     * `humanGateRequired = true`.
     */
    phaseBoundaryReached: z.boolean(),
    /**
     * Discriminator that distinguishes an intermediate technical
     * completion from the final project human gate.
     */
    phaseGateKind: z.enum(PHASE_GATE_KINDS).default('TECHNICAL_PHASE_GATE'),
    /**
     * True only when human testing is the actual blocker (final project
     * gate). Intermediate phases keep this false so the controller does
     * not stop with HUMAN_REVIEW_REQUIRED between phases.
     */
    humanAcceptanceDeferred: z.boolean().default(true),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .superRefine((s, ctx) => {
    // controllerArmed is only valid under the full-project autonomous
    // execution mode.
    if (s.executionMode === 'DEVELOPMENT_ONLY_HUMAN_VALIDATION' && s.controllerArmed !== false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'controllerArmed MUST be false under DEVELOPMENT_ONLY_HUMAN_VALIDATION (full-project autonomous execution not authorized)',
        path: ['controllerArmed'],
      });
    }
    if (s.humanGateRequired && s.currentWorkItemState === 'IN_PROGRESS') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'humanGateRequired is incompatible with currentWorkItemState=IN_PROGRESS',
        path: ['humanGateRequired'],
      });
    }
    if (
      s.currentWorkItemState === 'HUMAN_REVIEW_REQUIRED' &&
      s.phaseGateKind !== 'FINAL_PROJECT_HUMAN_GATE'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'HUMAN_REVIEW_REQUIRED is reserved for the FINAL project gate; intermediate phases must use READY_FOR_NEXT_PHASE_AUTHORIZATION',
        path: ['currentWorkItemState'],
      });
    }
    if (
      s.currentWorkItemState === 'READY_FOR_NEXT_PHASE_AUTHORIZATION' &&
      s.phaseGateKind === 'FINAL_PROJECT_HUMAN_GATE'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'READY_FOR_NEXT_PHASE_AUTHORIZATION is for intermediate phases; final gate must use HUMAN_REVIEW_REQUIRED',
        path: ['currentWorkItemState'],
      });
    }
  });

export type RuntimeState = z.infer<typeof RuntimeStateSchema>;

/**
 * Build an empty initial runtime state for a given phase + manifest.
 * Validates itself before returning.
 *
 * `controllerArmed` defaults to `false`. The agent or a CLI
 * command must explicitly set it to `true` (after the human-owner
 * `Project autonomous execution = AUTHORIZED` row has been recorded in
 * `PROJECT_STATUS.md`) before autonomous execution may begin.
 */
export function buildInitialRuntimeState(input: {
  phase: string;
  phaseAuthorization: 'NOT_AUTHORIZED' | 'AUTHORIZED';
  maxAttempts: number;
  controllerArmed?: boolean;
  executionMode?: ExecutionMode;
}): RuntimeState {
  const now = new Date().toISOString();
  const state: RuntimeState = RuntimeStateSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    controllerVersion: CONTROLLER_VERSION,
    executionMode: input.executionMode ?? 'DEVELOPMENT_ONLY_HUMAN_VALIDATION',
    currentPhase: input.phase,
    phaseAuthorization: input.phaseAuthorization,
    controllerArmed: input.controllerArmed ?? false,
    currentWorkItemId: null,
    currentWorkItemState: null,
    attempt: 0,
    maxAttempts: input.maxAttempts,
    lastTransition: null,
    lastFailureClass: null,
    humanGateRequired: false,
    phaseBoundaryReached: false,
    phaseGateKind: 'TECHNICAL_PHASE_GATE',
    humanAcceptanceDeferred: true,
    createdAt: now,
    updatedAt: now,
  });
  return state;
}

/**
 * Mirrored view of the human-owned fields in PROJECT_STATUS.md.
 * The controller reads this to verify that private runtime state never
 * outranks human authorization.
 */
export const PROJECT_STATUS_HUMAN_FIELDS = [
  'Current mode',
  'Deployment',
  'Production',
  'Phase 1 authorization',
  'Human acceptance',
  'Autonomous execution',
] as const;
export type ProjectStatusHumanField = (typeof PROJECT_STATUS_HUMAN_FIELDS)[number];

/**
 * Standard controller result envelope (machine-readable JSON output).
 */
export const ControllerResultSchema = z.object({
  ok: z.boolean(),
  code: z.string().min(1).max(64),
  message: z.string().min(1).max(1024),
  data: z.unknown().optional(),
});
export type ControllerResult = z.infer<typeof ControllerResultSchema>;

export function okResult(code: string, message: string, data?: unknown): ControllerResult {
  return { ok: true, code, message, data };
}
export function failResult(code: string, message: string, data?: unknown): ControllerResult {
  return { ok: false, code, message, data };
}
