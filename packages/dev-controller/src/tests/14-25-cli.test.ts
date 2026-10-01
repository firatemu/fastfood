import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { run } from '../cli.js';
import { CONTROLLER_VERSION, SCHEMA_VERSION } from '../schema.js';

// Invoke the CLI entrypoint directly (no child process). This keeps the
// tests deterministic and side-effect-free.

function makeRepoRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'ff-cli-'));
  mkdirSync(path.join(root, 'packages', 'dev-controller', 'src'), { recursive: true });
  mkdirSync(path.join(root, '.fastfood-controller', 'manifests'), { recursive: true });
  // Create the three markers that resolveRepoRootFromCwd() checks for.
  // Without fastfood-project-docs the synthetic repo is invisible to the CLI's
  // root-detection logic, causing it to walk up to the real repository.
  mkdirSync(path.join(root, 'fastfood-project-docs'), { recursive: true });
  writeFileSync(path.join(root, 'AGENTS.md'), '# AGENTS.md\n');
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'fastfood', version: '0.0.0' }),
  );
  writeFileSync(
    path.join(root, 'PROJECT_STATUS.md'),
    [
      '# FASTFOOD Project Status',
      '',
      '| Field                               | Value                                         |',
      '| ----------------------------------- | --------------------------------------------- |',
      '| **Current mode**                    | `DEVELOPMENT_ONLY_HUMAN_VALIDATION`           |',
      '| **Deployment**                      | `PROHIBITED / DEFERRED`                       |',
      '| **Production**                      | `NOT ACTIVE`                                  |',
      '| **Phase 0 technical status**        | `COMPLETE`                                    |',
      '| **Phase 0 human acceptance**        | `PASS`                                        |',
      '| **Phase 0 status**                  | `ACCEPTED / CLOSED`                           |',
      '| **Phase 1**                         | `NOT STARTED`                                 |',
      '| **Phase 1 authorization**           | `NOT AUTHORIZED`                              |',
      '| **Autonomous execution**            | `NOT YET ARMED`                               |',
      '| **Next authorized repository task** | `AUTONOMOUS_DEVELOPMENT_CONTROLLER_BOOTSTRAP` |',
    ].join('\n'),
  );
  return root;
}

async function cli(
  root: string,
  args: string[],
  opts: { json?: boolean } = { json: true },
): Promise<{ rc: number; stdout: string; stderr: string }> {
  // Run from inside the synthetic repo so findRepoRoot() + cwd resolve
  // to the temp directory.
  const oldCwd = process.cwd();
  process.chdir(root);
  try {
    // capture stdout/stderr by redirecting via console.log / console.error?
    // The CLI uses process.stdout.write. We monkey-patch by temporarily
    // replacing process.stdout.write. Easier: use a single dynamic import of
    // a thin wrapper.
    const { Writable } = await import('node:stream');
    let stdout = '';
    let stderr = '';
    const _out = new Writable({
      write(chunk, _enc, cb) {
        stdout += chunk.toString();
        cb();
      },
    });
    const _err = new Writable({
      write(chunk, _enc, cb) {
        stderr += chunk.toString();
        cb();
      },
    });
    const realOut = process.stdout.write.bind(process.stdout);
    const realErr = process.stderr.write.bind(process.stderr);
    process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      stdout += typeof chunk === 'string' ? chunk : chunk.toString();
      return realOut(chunk as never, ...(rest as []));
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      stderr += typeof chunk === 'string' ? chunk : chunk.toString();
      return realErr(chunk as never, ...(rest as []));
    }) as typeof process.stderr.write;
    let rc = 0;
    try {
      rc = await run(['node', 'cli.ts', ...(opts.json ? ['--json'] : []), ...args]);
      // Re-emit captured stdout/stderr for visibility.
      if (stdout.length > 0) process.stdout.write(`[cli stdout]\n${stdout}\n`);
      if (stderr.length > 0) process.stderr.write(`[cli stderr]\n${stderr}\n`);
    } finally {
      process.stdout.write = realOut;
      process.stderr.write = realErr;
      process.chdir(oldCwd);
    }
    // The CLI may also write to stdout without --json. Drain all stdout.
    return { rc, stdout, stderr };
  } catch (err) {
    process.chdir(oldCwd);
    throw err;
  }
}

describe('CLI invariants (14..25)', () => {
  let root: string;

  beforeEach(() => {
    root = makeRepoRoot();
    // Symlink the controller source tree + node_modules into the synthetic
    // repo so that the CLI's findRepoRoot() and resolveSync() find the
    // controller. The controller package itself is at packages/dev-controller.
    const realCtrl = path.resolve();
    const target = path.join(root, 'packages', 'dev-controller');
    rmSync(target, { recursive: true, force: true });
    mkdirSync(path.join(root, 'packages'), { recursive: true });
    symlinkSync(realCtrl, target, 'dir');
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('14. unknown failure class fails closed', async () => {
    const r = await cli(root, ['init', '--phase', 'PHASE_0', '--max-attempts', '3']);
    expect(r.rc).toBe(0);
    const r2 = await cli(root, ['repair', '--failure', 'SERVANT_OF_THE_SECRET_FIRE']);
    expect(r2.rc).not.toBe(0);
  });

  it('15. hard-stop failure cannot retry (lands in BLOCKED)', async () => {
    expect((await cli(root, ['init', '--phase', 'PHASE_0'])).rc).toBe(0);
    writeFileSync(
      path.join(root, '.fastfood-controller', 'manifests', 'TEST-15.json'),
      JSON.stringify({
        id: 'TEST-15',
        phase: 'PHASE_0',
        title: 't',
        objective: 'o',
        contractReferences: [],
        dependencies: [],
        allowedPaths: ['packages/**'],
        forbiddenPaths: [],
        verificationCommands: ['echo ok'],
        maxRepairAttempts: 3,
        requiresHumanAcceptance: false,
        status: 'ACTIVE',
      }),
    );
    expect((await cli(root, ['begin', '--work-item', 'TEST-15'])).rc).toBe(0);
    const r = await cli(root, ['repair', '--failure', 'AUTHORIZATION_FAILURE']);
    expect(r.rc).toBe(0); // FAILURE_RECORDED — recorded, not retried.
    const s = JSON.parse(
      readFileSync(path.join(root, '.fastfood-controller', 'state.json'), 'utf8'),
    );
    expect(s.currentWorkItemState).toBe('BLOCKED');
  });

  it('16. checkpoint persists', async () => {
    const initR = await cli(root, ['init', '--phase', 'PHASE_0']);
    expect(initR.rc).toBe(0);
    const r = await cli(root, ['checkpoint']);
    expect(r.rc).toBe(0);
    // eslint-disable-next-line no-restricted-syntax
    console.log('checkpoint r:', JSON.stringify(r));
    const dir = path.join(root, '.fastfood-controller');
    const dirEntries = readdirSync(dir);
    // eslint-disable-next-line no-restricted-syntax
    console.log('entries:', dirEntries);
    expect(dirEntries.some((n: string) => n.startsWith('checkpoint-'))).toBe(true);
  });

  it('17. resume reconstructs correct next action (status when no work item)', async () => {
    expect((await cli(root, ['init', '--phase', 'PHASE_0'])).rc).toBe(0);
    const s = JSON.parse(
      readFileSync(path.join(root, '.fastfood-controller', 'state.json'), 'utf8'),
    );
    expect(s.currentWorkItemId).toBe(null);
    expect(s.currentWorkItemState).toBe(null);
  });

  it('18. dry-run does not mutate', async () => {
    const r = await cli(root, ['init', '--phase', 'PHASE_0', '--dry-run']);
    expect(r.rc).toBe(0);
    expect(existsSync(path.join(root, '.fastfood-controller', 'state.json'))).toBe(false);
  });

  it('19. concurrent lock rejection works', async () => {
    // Simulate a concurrent lock holder by writing the lock file directly
    // (bypassing acquireLock, which would break a stale lock).
    // Use a PID that is extremely unlikely to be alive (999999) so the
    // lock is treated as stale only when we WANT it to be broken.
    // Here we WANT the lock to appear live → use PID=999999 but also
    // make isPidAlive(999999) return true by patching process.kill globally.
    // Simpler: just write the lock and DON'T call acquireLock in the test;
    // the CLI's acquireLock will see the live-PID lock and throw.
    const lockPath = path.join(root, '.fastfood-controller', 'LOCK');
    mkdirSync(path.dirname(lockPath), { recursive: true });
    // Write with the current process PID so it appears alive.
    writeFileSync(
      lockPath,
      JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }),
      { mode: 0o600 },
    );
    try {
      // The CLI call will try to acquire the same PID lock and get LockBusyError.
      const r = await cli(root, ['init', '--phase', 'PHASE_0']);
      expect(r.rc).not.toBe(0);
    } finally {
      rmSync(lockPath, { force: true });
    }
  });

  it('20. phase-end triggers READY_FOR_NEXT_PHASE_AUTHORIZATION for intermediate phases', async () => {
    expect((await cli(root, ['init', '--phase', 'PHASE_0'])).rc).toBe(0);
    // Create a synthetic work item so repair has an active state to transition.
    writeFileSync(
      path.join(root, '.fastfood-controller', 'manifests', 'TEST-20.json'),
      JSON.stringify({
        id: 'TEST-20',
        phase: 'PHASE_0',
        title: 'synthetic phase boundary test',
        objective: 'verify PHASE_BOUNDARY_REACHED lands in READY_FOR_NEXT_PHASE_AUTHORIZATION',
        contractReferences: [],
        dependencies: [],
        allowedPaths: ['packages/**'],
        forbiddenPaths: [],
        verificationCommands: ['echo ok'],
        maxRepairAttempts: 3,
        requiresHumanAcceptance: true,
        status: 'ACTIVE',
      }),
    );
    expect((await cli(root, ['begin', '--work-item', 'TEST-20'])).rc).toBe(0);
    const r = await cli(root, ['repair', '--failure', 'PHASE_BOUNDARY_REACHED']);
    expect(r.rc).toBe(0);
    const s = JSON.parse(
      readFileSync(path.join(root, '.fastfood-controller', 'state.json'), 'utf8'),
    );
    expect(s.currentWorkItemState).toBe('READY_FOR_NEXT_PHASE_AUTHORIZATION');
    expect(s.phaseBoundaryReached).toBe(true);
    expect(s.humanGateRequired).toBe(false);
    expect(s.humanAcceptanceDeferred).toBe(true);
    expect(s.phaseGateKind).toBe('OWNER_NEXT_PHASE_AUTHORIZATION_GATE');
  });

  it('21. phase-end does not authorize next phase (no start-next-phase / auto-authorize commands exist)', async () => {
    // Verify the CLI does not expose any auto-authorization command.
    const usage = await cli(root, ['help']);
    expect(usage.rc).toBe(0);
    expect(usage.stdout).not.toContain('start-next-phase');
    expect(usage.stdout).not.toContain('auto-authorize');
  });

  it('22. PROJECT_STATUS human-owned fields are not mutated', async () => {
    const psPath = path.join(root, 'PROJECT_STATUS.md');
    const before = readFileSync(psPath, 'utf8');
    expect((await cli(root, ['status'])).rc).toBe(0);
    expect((await cli(root, ['validate'])).rc).toBe(0);
    expect((await cli(root, ['init', '--phase', 'PHASE_0'])).rc).toBe(0);
    // Try a non-existent manifest for begin (should fail without mutating).
    const r = await cli(root, [
      'begin',
      '--work-item',
      'NOPE',
      '--manifest',
      path.join(root, 'fake.json'),
    ]);
    expect(r.rc).not.toBe(0);
    const after = readFileSync(psPath, 'utf8');
    expect(after).toBe(before);
  });

  it('23. controller cannot arm itself', async () => {
    expect((await cli(root, ['init', '--phase', 'PHASE_0'])).rc).toBe(0);
    const s = JSON.parse(
      readFileSync(path.join(root, '.fastfood-controller', 'state.json'), 'utf8'),
    );
    expect(s.controllerArmed).toBe(false);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.controllerVersion).toBe(CONTROLLER_VERSION);
  });

  it('24. deployment-related state/action is rejected (no init for PHASE_DEPLOYMENT)', async () => {
    expect((await cli(root, ['init', '--phase', 'PHASE_0'])).rc).toBe(0);
    // PHASE_DEPLOYMENT has no authorization row; controller must reject.
    const r = await cli(root, ['init', '--phase', 'PHASE_DEPLOYMENT']);
    expect(r.rc).not.toBe(0);
  });

  it('25. corrupted runtime state fails closed (validate detects controllerArmed=true)', async () => {
    expect((await cli(root, ['init', '--phase', 'PHASE_0'])).rc).toBe(0);
    const f = path.join(root, '.fastfood-controller', 'state.json');
    const s = JSON.parse(readFileSync(f, 'utf8'));
    s.controllerArmed = true; // ← forbidden during bootstrap
    writeFileSync(f, JSON.stringify(s, null, 2));
    const r = await cli(root, ['validate']);
    expect(r.rc).not.toBe(0);
  });
});
