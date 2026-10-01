import { existsSync } from 'node:fs';
import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Deterministic repository-local controller lock.
 *
 * Single-host POSIX lockfile at `<state-dir>/LOCK`.
 * - Held by writing the current PID + timestamp into the file.
 * - Released by deleting the file.
 * - Stale lock detected when the owning PID is no longer alive.
 *
 * No distributed locking. No timeout racing.
 */

export const LOCK_FILENAME = 'LOCK';

export interface AcquiredLock {
  readonly path: string;
  readonly pid: number;
  readonly acquiredAt: string;
}

export class LockBusyError extends Error {
  readonly path: string;
  readonly owner: { pid: number | null; acquiredAt: string | null } | null;
  constructor(path: string, owner: { pid: number | null; acquiredAt: string | null } | null) {
    super(`lock busy: ${path} (owner=${owner?.pid ?? 'unknown'})`);
    this.name = 'LockBusyError';
    this.path = path;
    this.owner = owner;
  }
}

function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    // signal 0 = check existence without sending a signal.
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readLock(path: string): Promise<{ pid: number; acquiredAt: string } | null> {
  if (!existsSync(path)) return null;
  const raw = await (await import('node:fs/promises')).readFile(path, 'utf8');
  try {
    const parsed = JSON.parse(raw) as { pid: number; acquiredAt: string };
    if (typeof parsed.pid !== 'number' || typeof parsed.acquiredAt !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Acquire the lock. If another holder is alive, throws LockBusyError.
 * If the lock is stale (owning pid no longer alive), it is broken and
 * re-acquired.
 */
export async function acquireLock(stateDir: string): Promise<AcquiredLock> {
  await mkdir(stateDir, { recursive: true });
  const p = path.join(stateDir, LOCK_FILENAME);
  const existing = await readLock(p);
  if (existing) {
    if (isPidAlive(existing.pid)) {
      throw new LockBusyError(p, existing);
    }
    // Stale lock — break it.
    await unlink(p).catch(() => undefined);
  }
  const acquired: AcquiredLock = {
    path: p,
    pid: process.pid,
    acquiredAt: new Date().toISOString(),
  };
  // Best-effort atomic create. Two concurrent acquirers will both fail or
  // both succeed at the rename stage; we re-check after.
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, JSON.stringify(acquired), { encoding: 'utf8', mode: 0o600 });
  try {
    await rename(tmp, p);
  } catch (err) {
    await unlink(tmp).catch(() => undefined);
    throw err;
  }
  // Re-check: someone else may have raced us. If our pid is on disk, keep it.
  const after = await readLock(p);
  if (!after || after.pid !== process.pid) {
    // We lost the race; surface as busy if owner is alive, else steal.
    if (after && isPidAlive(after.pid)) {
      throw new LockBusyError(p, after);
    }
  }
  return acquired;
}

/** Release a held lock. Best-effort; safe to call when not held. */
export async function releaseLock(lock: AcquiredLock): Promise<void> {
  try {
    const s = await stat(lock.path);
    if (!s.isFile()) return;
  } catch {
    return;
  }
  const cur = await readLock(lock.path);
  if (cur && cur.pid === lock.pid) {
    await unlink(lock.path).catch(() => undefined);
  }
}
