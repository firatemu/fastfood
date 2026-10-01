#!/usr/bin/env node
/* eslint-disable no-console, no-restricted-syntax */
/**
 * Pull Stitch HTML via Chrome DevTools Protocol — use real Chrome (Google login works).
 */
import { chromium } from '@playwright/test';

import {
  apiKey,
  downloadAllScreens,
  loadEnvLocal,
  printGoogleBlockedHelp,
  publishRaw,
} from './stitch-pull-lib.mjs';

loadEnvLocal();

function defaultCdpUrl() {
  if (process.env.STITCH_CDP_URL?.trim()) return process.env.STITCH_CDP_URL.trim();
  return 'http://127.0.0.1:9222';
}

async function main() {
  const key = apiKey();
  if (!key) {
    console.error('Missing STITCH_API_KEY (.env.local or .cursor/mcp.json)');
    process.exit(1);
  }

  const cdpUrl = defaultCdpUrl();
  console.log(`Connecting to Chrome CDP at ${cdpUrl} …`);

  let browser;
  try {
    browser = await chromium.connectOverCDP(cdpUrl, { timeout: 15_000 });
  } catch (e) {
    console.error(`CDP bağlantısı başarısız: ${e instanceof Error ? e.message : e}`);
    printGoogleBlockedHelp();
    process.exit(1);
  }

  const context = browser.contexts()[0];
  if (!context) {
    console.error('Chrome bağlı ama context yok. Debugging port ile Chrome açık mı?');
    printGoogleBlockedHelp();
    process.exit(1);
  }

  const ok = await downloadAllScreens(context.request, key);
  if (ok === 0) {
    console.error(
      '\nİndirme başarısız. Bu Chrome penceresinde stitch.withgoogle.com ile giriş yapın ve tekrar deneyin.',
    );
    printGoogleBlockedHelp();
    process.exit(1);
  }

  publishRaw();
  console.log('\nBitti. Bu komut Chrome’u kapatmaz (CDP oturumu açık kalır).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
