#!/usr/bin/env node
/* eslint-disable no-console, no-restricted-syntax */
/** Copy valid `.stitch/export/<slug>/code.html` → `public/stitch-raw/<slug>.html` */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { enrichStitchHtml } from './stitch-enrich-html.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPORT = join(ROOT, '.stitch', 'export');
const OUT = join(ROOT, 'public', 'stitch-raw');

function valid(html) {
  if (!html || html.includes('accounts.google.com')) return false;
  return html.includes('<!DOCTYPE') || html.includes('<html');
}

mkdirSync(OUT, { recursive: true });
let n = 0;
for (const slug of readdirSync(EXPORT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
  const src = join(EXPORT, slug, 'code.html');
  if (!existsSync(src)) continue;
  const html = readFileSync(src, 'utf8');
  if (!valid(html)) {
    console.warn(`skip ${slug}: invalid HTML`);
    continue;
  }
  const enriched = enrichStitchHtml(html);
  writeFileSync(join(OUT, `${slug}.html`), enriched, 'utf8');
  console.log(`published ${slug}.html (${enriched.length} bytes)`);
  n += 1;
}
if (n === 0) process.exit(1);
