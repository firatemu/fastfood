/* eslint-disable no-console, no-restricted-syntax */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ID = '2120742513648709986';
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = join(ROOT, '.stitch', 'export');

export const SCREENS = [
  { id: '1fac985462d045299bcb7556c0cfc382', slug: 'home' },
  { id: '0800509053b74cf59c729890003b03a8', slug: 'auth' },
  { id: '4e8f71e4e9684b6eb6810e655cff009f', slug: 'account' },
  { id: '681fdb0a0fe048dc94a84d3e62239e11', slug: 'orders' },
  { id: '64a4ef046479416d9111dd68ee938cba', slug: 'pdp-cart' },
  { id: '01f53c8ea72248118e6fc2f030a84a97', slug: 'checkout' },
];

export function loadEnvLocal() {
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

export function apiKey() {
  if (process.env.STITCH_API_KEY) return process.env.STITCH_API_KEY;
  try {
    const mcp = JSON.parse(readFileSync(join(ROOT, '../../.cursor/mcp.json'), 'utf8'));
    return mcp?.mcpServers?.stitch?.headers?.['X-Goog-Api-Key'];
  } catch {
    return undefined;
  }
}

export async function mcpGetDownloadUrl(screenId, key) {
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

function isHtml(body) {
  return body.includes('<html') || body.includes('<!DOCTYPE');
}

/**
 * @param {{ get: (url: string, opts?: object) => Promise<{ ok: () => boolean, status: () => number, text: () => Promise<string> }> }} http
 */
export async function downloadAllScreens(http, key) {
  mkdirSync(OUT, { recursive: true });
  let ok = 0;
  for (const screen of SCREENS) {
    const dir = join(OUT, screen.slug);
    mkdirSync(dir, { recursive: true });
    try {
      const url = await mcpGetDownloadUrl(screen.id, key);
      if (!url) throw new Error('No htmlCode.downloadUrl from MCP');

      const response = await http.get(url, { timeout: 120_000 });
      const body = await response.text();
      if (!response.ok() || body.includes('accounts.google.com')) {
        throw new Error(`HTTP ${response.status()} or sign-in page`);
      }
      if (!isHtml(body)) {
        throw new Error('Response is not HTML');
      }
      writeFileSync(join(dir, 'code.html'), body, 'utf8');
      console.log(`OK  ${screen.slug}  (${body.length} bytes)`);
      ok += 1;
    } catch (e) {
      console.error(`FAIL ${screen.slug}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return ok;
}

export function publishRaw() {
  spawnSync(process.execPath, ['scripts/stitch-publish-raw.mjs'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

export function printGoogleBlockedHelp() {
  console.error(`
Google, Playwright Chromium oturumunu "güvensiz tarayıcı" sayar.

Önerilen: gerçek Chrome ile CDP (zaten giriş yaptığınız tarayıcı veya ayrı profil):

  Windows (PowerShell veya cmd) — önce TÜM Chrome pencerelerini kapatın:
    "& $env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe" ^
      --remote-debugging-port=9222 ^
      --user-data-dir="$env:LOCALAPPDATA\\fastfood-stitch-cdp"

  WSL2 (Windows 11 / localhost forwarding): doğrudan localhost kullanın:
    pnpm --filter @fastfood/storefront-web stitch:pull:cdp
    # veya: export STITCH_CDP_URL=http://127.0.0.1:9222

  Eski WSL'de localhost işe yaramazsa Windows host IP (default gateway, nameserver DEĞİL):
    export STITCH_CDP_URL=http://$(ip route show default | awk '{print $3}'):9222

  Chrome'da stitch.withgoogle.com ile giriş yapın, sonra stitch:pull:cdp.

Alternatif: normal Chrome'da Stitch'te HTML indirirken DevTools → Network →
contribution.usercontent.google.com → Authorization: Bearer … kopyalayın:
  export STITCH_ACCESS_TOKEN='…'
  pnpm --filter @fastfood/storefront-web stitch:pull
`);
}
