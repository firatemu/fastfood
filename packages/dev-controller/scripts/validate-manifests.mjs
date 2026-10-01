#!/usr/bin/env node
/**
 * Standalone manifest validator — runs against `.fastfood-controller/manifests/`.
 * Validates every `P3-*.json` (or wildcard) against the controller's
 * real `ManifestSchema`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MANIFESTS_DIR =
  process.env['MANIFESTS_DIR'] ?? path.resolve(ROOT, '../.fastfood-controller/manifests');
const PREFIX = process.env['PREFIX'] ?? 'P3-';

const { ManifestSchema } = await import('../src/schema.ts');

const files = readdirSync(MANIFESTS_DIR)
  .filter((f) => f.startsWith(PREFIX) && f.endsWith('.json'))
  .sort();

let ok = 0;
let fail = 0;
for (const f of files) {
  const raw = readFileSync(path.join(MANIFESTS_DIR, f), 'utf8');
  const data = JSON.parse(raw);
  const result = ManifestSchema.safeParse(data);
  if (result.success) {
    console.log(`OK   ${f}: ${data.title}`);
    ok++;
  } else {
    console.log(
      `FAIL ${f}: ${JSON.stringify(
        result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      )}`,
    );
    fail++;
  }
}

console.log(`\n${ok}/${ok + fail} PASS`);
process.exit(fail === 0 ? 0 : 1);
