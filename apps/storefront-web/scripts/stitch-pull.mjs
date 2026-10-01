#!/usr/bin/env node
/* eslint-disable no-console, no-restricted-syntax */
/**
 * Pull Stitch screen HTML into .stitch/export/<slug>/code.html
 * Requires STITCH_API_KEY and STITCH_ACCESS_TOKEN (Google OAuth bearer).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ID = '2120742513648709986';
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

const SCREENS = [
  { id: '1fac985462d045299bcb7556c0cfc382', slug: 'home' },
  { id: '0800509053b74cf59c729890003b03a8', slug: 'auth' },
  { id: '4e8f71e4e9684b6eb6810e655cff009f', slug: 'account' },
  { id: '681fdb0a0fe048dc94a84d3e62239e11', slug: 'orders' },
  { id: '64a4ef046479416d9111dd68ee938cba', slug: 'pdp-cart' },
  { id: '01f53c8ea72248118e6fc2f030a84a97', slug: 'checkout' },
];

function apiKey() {
  if (process.env.STITCH_API_KEY) return process.env.STITCH_API_KEY;
  try {
    const mcp = JSON.parse(readFileSync(join(ROOT, '../../.cursor/mcp.json'), 'utf8'));
    return mcp?.mcpServers?.stitch?.headers?.['X-Goog-Api-Key'];
  } catch {
    return undefined;
  }
}

function resolveGcloudBin() {
  if (process.env.GCLOUD_BIN && existsSync(process.env.GCLOUD_BIN)) {
    return process.env.GCLOUD_BIN;
  }
  const candidates = [
    join(homedir(), 'google-cloud-sdk', 'bin', 'gcloud'),
    '/usr/bin/gcloud',
    '/usr/local/bin/gcloud',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  const which = spawnSync('which', ['gcloud'], { encoding: 'utf8' });
  if (which.status === 0) {
    const p = which.stdout.trim();
    if (p) return p;
  }
  return null;
}

function resolveAccessToken() {
  if (process.env.STITCH_ACCESS_TOKEN?.trim()) {
    return process.env.STITCH_ACCESS_TOKEN.trim();
  }
  const gcloud = resolveGcloudBin();
  if (!gcloud) return null;
  const result = spawnSync(
    gcloud,
    ['auth', 'application-default', 'print-access-token'],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return null;
  const token = result.stdout.trim();
  return token || null;
}

async function mcpGetScreen(screenId, key) {
  const res = await fetch('https://stitch.googleapis.com/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'X-Goog-Api-Key': key,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_screen',
        arguments: { name: `projects/${PROJECT_ID}/screens/${screenId}` },
      },
    }),
  });
  const text = await res.text();
  const line = text.split('\n').find((l) => l.includes('"htmlCode"')) ?? text;
  const json = JSON.parse(line.startsWith('{') ? line : text);
  const inner =
    json?.result?.structuredContent ??
    JSON.parse(json?.result?.content?.[0]?.text ?? '{}');
  return inner?.htmlCode?.downloadUrl;
}

async function downloadHtml(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0 (compatible; fastfood-stitch-pull/1.0)',
    },
    redirect: 'follow',
  });
  const body = await res.text();
  if (!res.ok || body.includes('accounts.google.com')) {
    if (res.status === 403) {
      throw new Error(
        'HTTP 403 insufficient_scope — gcloud token cannot include Stitch scopes; run: pnpm --filter @fastfood/storefront-web stitch:pull:browser',
      );
    }
    throw new Error(`HTTP ${res.status} or Google sign-in interstitial`);
  }
  if (!body.includes('<html') && !body.includes('<!DOCTYPE')) {
    throw new Error('Response is not HTML');
  }
  return body;
}

async function mainInner() {
  const key = apiKey();
  const token = resolveAccessToken();
  if (!key) {
    console.error('Missing STITCH_API_KEY (.env.local or STITCH_API_KEY env)');
    process.exit(1);
  }
  if (!token) {
    console.error(
      'Google OAuth token required for HTML download.\n' +
        '  Run: gcloud auth application-default login\n' +
        '  Or: export STITCH_ACCESS_TOKEN=$(gcloud auth application-default print-access-token)\n' +
        `  (gcloud: ${resolveGcloudBin() ?? 'not found — set GCLOUD_BIN'})`,
    );
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  let ok = 0;
  for (const screen of SCREENS) {
    const dir = join(OUT, screen.slug);
    mkdirSync(dir, { recursive: true });
    try {
      const url = await mcpGetScreen(screen.id, key);
      if (!url) throw new Error('No htmlCode.downloadUrl');
      const html = await downloadHtml(url, token);
      writeFileSync(join(dir, 'code.html'), html, 'utf8');
      console.log(`OK  ${screen.slug}  (${html.length} bytes)`);
      ok += 1;
    } catch (e) {
      console.error(`FAIL ${screen.slug}: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (ok === 0) process.exit(1);
  spawnSync(process.execPath, ['scripts/stitch-publish-raw.mjs'], { cwd: ROOT, stdio: 'inherit' });
}

mainInner().catch((e) => {
  console.error(e);
  process.exit(1);
});
