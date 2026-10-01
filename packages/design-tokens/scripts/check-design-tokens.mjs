#!/usr/bin/env node
// Deterministic design-token consumer enforcement script.
//
// Purpose (Phase 2 preparation, R-P2-09 / P2-004):
//   Ensure that `packages/ui-web/src/**` and `packages/ui-native/src/**`
//   do not introduce arbitrary hardcoded visual values that should come
//   from `@fastfood/design-tokens`. Allowed exception: the canonical
//   set of token values inside the design-tokens package itself.
//
// Detected violations:
//   1. Raw hex color literals (e.g. #fff, #abcdef, #abcdef12) outside
//      permitted inline-style paths.
//   2. Hardcoded `border-radius` / `borderRadius` pixel values that are
//      not one of the canonical radius tokens
//      (`radius.sm` = 6px, `radius.md` = 10px, `radius.lg` = 14px,
//      `radius.xl` = 20px, `radius.2xl` = 28px, `radius.full` = 9999px).
//   3. Hardcoded `box-shadow` / `shadow` values that are not one of the
//      canonical shadow tokens
//      (`shadow.sm`, `shadow.md`, `shadow.lg`).
//   4. Hardcoded spacing pixel values that are not one of the canonical
//      space tokens (`space.0`..`space.24`).
//
// Exit code: 0 = clean, 1 = at least one violation found.
//
// This script is intentionally deterministic and dependency-free. It
// operates only on regex matching against the source text — no AST, no
// TypeScript compiler. Future work may swap to a proper AST-based rule.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');

const SCAN_TARGETS = [
  join(REPO_ROOT, 'packages', 'ui-web', 'src'),
  join(REPO_ROOT, 'packages', 'ui-native', 'src'),
];

const ALLOWED_RADIUS_PX = new Set([6, 10, 14, 20, 28, 9999]);
const ALLOWED_SHADOW_TOKENS = new Set(['shadow.sm', 'shadow.md', 'shadow.lg']);
const ALLOWED_SPACE_PX = new Set([0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96]);
const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RADIUS_PX_RE = /(?:border-?[Rr]adius|radius)\s*:\s*['"]?\s*(\d+)\s*px/g;
const RADIUS_NUMERIC_RE =
  /(?:border-?[Rr]adius|radius)\s*:\s*['"]?\s*(\d+)\s*(?:px|rem|em)?\s*['";\s,)]/g;
const SHADOW_RE = /(?:box-?[Ss]hadow|shadow)\s*:\s*['"]\s*([^'"\n]+)/g;
const SPACE_PX_RE =
  /\b(?:margin|padding|gap)(?:-(?:top|right|bottom|left|inline|block))?\s*:\s*['"]?\s*(\d+)\s*px/g;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '__tests__') {
        continue;
      }
      walk(p, out);
    } else if (/\.(ts|tsx|css|mjs|js)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

const violations = [];

for (const target of SCAN_TARGETS) {
  const files = walk(target);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');

    // 1. Hex literals.
    for (const m of text.matchAll(HEX_RE)) {
      violations.push({
        file: relative(REPO_ROOT, file),
        line: lineOf(text, m.index ?? 0),
        kind: 'HEX_LITERAL',
        value: m[0],
      });
    }

    // 2. Radius pixel values.
    for (const m of text.matchAll(RADIUS_PX_RE)) {
      const px = Number(m[1]);
      if (!ALLOWED_RADIUS_PX.has(px)) {
        violations.push({
          file: relative(REPO_ROOT, file),
          line: lineOf(text, m.index ?? 0),
          kind: 'RADIUS_NOT_IN_TOKEN',
          value: `${px}px`,
        });
      }
    }

    // 3. Shadow values.
    for (const m of text.matchAll(SHADOW_RE)) {
      const value = (m[1] ?? '').trim();
      const isCanonical = ['shadow.sm', 'shadow.md', 'shadow.lg'].some((t) => value.includes(t));
      if (!isCanonical) {
        violations.push({
          file: relative(REPO_ROOT, file),
          line: lineOf(text, m.index ?? 0),
          kind: 'SHADOW_NOT_IN_TOKEN',
          value,
        });
      }
    }

    // 4. Spacing pixel values.
    for (const m of text.matchAll(SPACE_PX_RE)) {
      const px = Number(m[1]);
      if (!ALLOWED_SPACE_PX.has(px)) {
        violations.push({
          file: relative(REPO_ROOT, file),
          line: lineOf(text, m.index ?? 0),
          kind: 'SPACING_NOT_IN_TOKEN',
          value: `${px}px`,
        });
      }
    }
  }
}

if (violations.length > 0) {
  process.stdout.write(`design-token check FAILED: ${violations.length} violation(s)\n`);
  for (const v of violations) {
    process.stdout.write(`  ${v.file}:${v.line}  ${v.kind}  ${v.value}\n`);
  }
  process.exit(1);
}

process.stdout.write('design-token check PASSED\n');
process.exit(0);
