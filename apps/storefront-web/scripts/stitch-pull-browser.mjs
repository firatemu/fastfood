#!/usr/bin/env node
/* eslint-disable no-console, no-restricted-syntax */
/**
 * Pull Stitch HTML using a logged-in browser session.
 * Prefer stitch:pull:cdp — Google often blocks Playwright Chromium login.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import { chromium } from '@playwright/test';

import {
  apiKey,
  downloadAllScreens,
  loadEnvLocal,
  printGoogleBlockedHelp,
  publishRaw,
  ROOT,
} from './stitch-pull-lib.mjs';

const PROFILE = join(ROOT, '.stitch', 'browser-profile');
const STITCH_ORIGIN = 'https://stitch.withgoogle.com/';

loadEnvLocal();

async function waitForEnter(message) {
  if (process.env.STITCH_BROWSER_SKIP_PROMPT === '1') return;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await new Promise((resolve) => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

function launchOptions() {
  const headless = process.env.STITCH_BROWSER_HEADLESS === '1';
  const channel = process.env.STITCH_BROWSER_CHANNEL?.trim() || 'chrome';
  const base = {
    headless,
    viewport: { width: 1280, height: 900 },
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled'],
  };
  if (channel === 'chromium') {
    return base;
  }
  return { ...base, channel };
}

async function main() {
  const key = apiKey();
  if (!key) {
    console.error('Missing STITCH_API_KEY (.env.local or .cursor/mcp.json)');
    process.exit(1);
  }

  mkdirSync(PROFILE, { recursive: true });

  const headless = process.env.STITCH_BROWSER_HEADLESS === '1';
  const channel = process.env.STITCH_BROWSER_CHANNEL?.trim() || 'chrome';
  console.log(
    `Launching ${channel === 'chromium' ? 'Playwright Chromium' : `Chrome (${channel})`}…`,
  );
  if (!headless) {
    console.log(
      'Google "güvensiz tarayıcı" derse: pnpm --filter @fastfood/storefront-web stitch:pull:cdp',
    );
  }

  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE, launchOptions());
  } catch (e) {
    console.error(`Tarayıcı açılamadı (${channel}): ${e instanceof Error ? e.message : e}`);
    console.error('STITCH_BROWSER_CHANNEL=chromium deneyin veya stitch:pull:cdp kullanın.');
    printGoogleBlockedHelp();
    process.exit(1);
  }

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(STITCH_ORIGIN, { waitUntil: 'domcontentloaded', timeout: 120_000 });

    const title = await page.title();
    const url = page.url();
    if (
      !headless &&
      (title.toLowerCase().includes('couldn') ||
        url.includes('accounts.google.com/v3/signin/rejected'))
    ) {
      console.error('\nGoogle bu oturumu reddetti (otomasyon / güvensiz tarayıcı).');
      printGoogleBlockedHelp();
      process.exit(1);
    }

    if (!headless) {
      await waitForEnter(
        '\nStitch / Google oturumu hazır olduğunda Enter’a basın (indirmeler başlar)… ',
      );
    } else {
      await page.waitForTimeout(2000);
    }

    const ok = await downloadAllScreens(context.request, key);
    if (ok === 0) {
      printGoogleBlockedHelp();
      process.exit(1);
    }
    publishRaw();
  } finally {
    await context.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
