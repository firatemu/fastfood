#!/usr/bin/env node
/* eslint-disable no-console, no-restricted-syntax */
/**
 * Pull all screens via @google/stitch-sdk (needs STITCH_API_KEY + STITCH_ACCESS_TOKEN).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stitch } from '@google/stitch-sdk';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.stitch', 'export');

function loadEnvLocal() {
  try {
    const text = readFileSync(join(ROOT, '.env.local'), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

function apiKey() {
  if (process.env.STITCH_API_KEY) return process.env.STITCH_API_KEY;
  const mcp = JSON.parse(readFileSync(join(ROOT, '../../.cursor/mcp.json'), 'utf8'));
  return mcp?.mcpServers?.stitch?.headers?.['X-Goog-Api-Key'];
}

async function main() {
  const key = apiKey();
  if (!key) {
    console.error('STITCH_API_KEY missing');
    process.exit(1);
  }
  if (!process.env.STITCH_ACCESS_TOKEN) {
    console.error('Set STITCH_ACCESS_TOKEN (gcloud auth application-default print-access-token)');
    process.exit(1);
  }
  process.env.STITCH_API_KEY = key;
  const project = stitch.project('2120742513648709986');
  const result = await project.downloadAssets(OUT);
  if (!result.success) {
    console.error(result.error);
    process.exit(1);
  }
  console.log('Downloaded:', result.downloadedScreens);
  spawnSync(process.execPath, ['scripts/stitch-publish-raw.mjs'], { cwd: ROOT, stdio: 'inherit' });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
