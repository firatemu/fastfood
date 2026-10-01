import { existsSync } from 'node:fs';
import { mkdir, rename, writeFile, unlink, stat, chmod } from 'node:fs/promises';
import path from 'node:path';

/**
 * Atomic file write helper.
 *
 * Writes to `<target>.tmp-<pid>-<seq>` then renames over `target`.
 * If rename fails we unlink the temp file so we never leak partial state.
 *
 * No daemon, no fsync, no fancy WAL — just enough to avoid partially-written
 * state files inside the controller's gitignored runtime directory.
 */
let _seq = 0;

function nextSeq(): string {
  _seq = (_seq + 1) >>> 0;
  return `${process.pid}-${Date.now()}-${_seq}`;
}

export async function atomicWriteFile(targetPath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const tmp = `${targetPath}.tmp-${nextSeq()}`;
  await writeFile(tmp, contents, { encoding: 'utf8', mode: 0o600 });
  try {
    await rename(tmp, targetPath);
  } catch (err) {
    await unlink(tmp).catch(() => undefined);
    throw err;
  }
}

export async function atomicReadJson<T>(targetPath: string): Promise<T | null> {
  if (!existsSync(targetPath)) return null;
  const raw = await (await import('node:fs/promises')).readFile(targetPath, 'utf8');
  return JSON.parse(raw) as T;
}

export async function ensureMode(targetPath: string, mode: number): Promise<void> {
  if (!existsSync(targetPath)) return;
  const s = await stat(targetPath);
  // chmod rejects if mode === current mode (no change). Only call when needed.
  if ((s.mode & 0o777) !== mode) {
    await chmod(targetPath, mode).catch(() => undefined);
  }
}
