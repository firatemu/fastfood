/**
 * CLI-level HV validation: drives the actual `run(argv)` entrypoint
 * through several scenarios, including dry-run, JSON output, and
 * human-readable output checks.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, it, expect, afterEach, beforeEach } from 'vitest';

import { run } from '../cli.js';

function isolated(): string {
  return mkdtempSync(path.join(tmpdir(), 'ff-hv-cli-'));
}

function makeRepo(): string {
  const root = isolated();
  mkdirSync(path.join(root, 'packages', 'dev-controller'), { recursive: true });
  mkdirSync(path.join(root, '.fastfood-controller', 'manifests'), { recursive: true });
  mkdirSync(path.join(root, 'fastfood-project-docs'), { recursive: true });
  writeFileSync(path.join(root, 'AGENTS.md'), '# AGENTS\n');
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fastfood' }));
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
      '| **Next authorized repository task** | `AUTONOMOUS_CONTROLLER_HUMAN_VALIDATION`     |',
    ].join('\n'),
  );
  return root;
}

async function cliRun(
  argv: string[],
  cwd: string,
): Promise<{ rc: number; stdout: string; stderr: string }> {
  const oldCwd = process.cwd();
  process.chdir(cwd);
  try {
    let stdout = '';
    let stderr = '';
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
      rc = await run(['node', 'cli.ts', ...argv]);
    } finally {
      process.stdout.write = realOut;
      process.stderr.write = realErr;
      process.chdir(oldCwd);
    }
    return { rc, stdout, stderr };
  } catch (err) {
    process.chdir(oldCwd);
    throw err;
  }
}

describe('HV-CLI: human-readable + JSON + dry-run', () => {
  let root: string;
  beforeEach(() => {
    root = makeRepo();
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('CLI: dry-run does not mutate state file', async () => {
    const r = await cliRun(['init', '--phase', 'PHASE_0', '--dry-run', '--json'], root);
    expect(r.rc).toBe(0);
    expect(existsSync(path.join(root, '.fastfood-controller', 'state.json'))).toBe(false);
    expect(JSON.parse(r.stdout).code).toBe('DRY_RUN');
  });

  it('CLI: human-readable status without JSON', async () => {
    await cliRun(['init', '--phase', 'PHASE_0'], root);
    const r = await cliRun(['status'], root);
    expect(r.rc).toBe(0);
    // Should contain key fields human-readable.
    expect(r.stdout).toContain('currentPhase');
    expect(r.stdout).toContain('controllerArmed');
    expect(r.stdout).toContain('PHASE_0');
  });

  it('CLI: JSON output is parseable and authoritative', async () => {
    await cliRun(['init', '--phase', 'PHASE_0'], root);
    const r = await cliRun(['status', '--json'], root);
    expect(r.rc).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBe('STATUS');
    expect(parsed.data.state.controllerArmed).toBe(false);
    expect(parsed.data.state.phaseAuthorization).toBe('AUTHORIZED');
  });

  it('CLI: help does not expose bypass commands', async () => {
    const r = await cliRun(['help'], root);
    expect(r.rc).toBe(0);
    // No CLI command that bypasses human gates, auto-authorizes phase, or
    // enables autonomous execution.
    expect(r.stdout).not.toContain('start-next-phase');
    expect(r.stdout).not.toContain('auto-authorize');
    expect(r.stdout).not.toContain('arm-autonomous');
    expect(r.stdout).not.toContain('deploy');
    expect(r.stdout).not.toContain('production-on');
  });

  it('CLI: Phase 1 init rejected', async () => {
    const r = await cliRun(['init', '--phase', 'PHASE_1', '--json'], root);
    expect(r.rc).not.toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.code).toBe('AUTHORIZATION_FAILURE');
    // Real state never written.
    expect(existsSync(path.join(root, '.fastfood-controller', 'state.json'))).toBe(false);
  });
});
