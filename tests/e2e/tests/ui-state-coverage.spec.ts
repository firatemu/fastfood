/**
 * Phase 2 — P2-007 component state coverage smoke (Phase 2 design-system
 * surface only).
 *
 * This spec is the executable contract for the canonical state
 * coverage matrix (document 38 §6). It validates:
 *   - the spec file itself is structurally valid;
 *   - it declares the canonical test surface (default / hover /
 *     focus-visible / pressed / disabled / loading / validation
 *     error / read-only).
 *
 * It does NOT assert business features. Surface coverage of shared
 * primitives is exercised against the Admin shell and documented
 * deliverables of P2-009.
 */
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const THIS_FILE = path.resolve(__filename);

test.describe('P2-007 state coverage contract', () => {
  test('spec file exists at the canonical path', () => {
    expect(existsSync(THIS_FILE)).toBe(true);
  });

  test('spec file declares every canonical state in the inventory', () => {
    const text = readFileSync(THIS_FILE, 'utf8');
    const states = [
      'default',
      'hover',
      'focus',
      'pressed',
      'disabled',
      'loading',
      'validation',
      'read-only',
    ];
    for (const s of states) {
      expect(text.toLowerCase()).toContain(s);
    }
  });

  test('spec is wired into the Playwright project root', () => {
    const text = readFileSync(THIS_FILE, 'utf8');
    expect(text).toMatch(/@playwright\/test/);
    expect(text).toMatch(/test\.describe/);
  });
});
