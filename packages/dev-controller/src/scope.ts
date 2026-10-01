import type { Manifest } from './schema.js';

/**
 * Deterministic scope guard. Compares a proposed/observed changed-file
 * list to a manifest allowedPaths and forbiddenPaths. The controller
 * does NOT inspect the real filesystem; callers supply the changed-file
 * list.
 *
 * Glob semantics (intentionally small; see task spec §11):
 *   - single star (*) matches any non-slash chars in one segment
 *   - globstar (**) at END matches zero or more remaining segments
 *     e.g. "packages/api/**" matches "packages/api", "packages/api/foo",
 *          "packages/api/src/main.ts"
 *   - globstar (**) in MIDDLE matches zero or one segment
 *   - exact path segments work as literal matches
 */

export interface ScopeViolation {
  readonly path: string;
  readonly reason: 'OUTSIDE_ALLOWED' | 'FORBIDDEN';
}

/**
 * Match a glob pattern against a path string using segment-by-segment logic.
 *
 * Algorithm:
 * - Split glob and path into non-empty segments by "/".
 * - Match left-to-right; ** consumes zero or more path segments and
 *   requires the next glob segment to match the remaining suffix.
 * - A trailing ** consumes all remaining path segments.
 */
function matchesGlob(glob: string, path: string): boolean {
  const globSegs = glob.split('/').filter(Boolean);
  const pathSegs = path.split('/').filter(Boolean);

  return matchRec(globSegs, 0, pathSegs, 0);
}

function matchSeg(gs: string, ps: string): boolean {
  // Both should be non-empty single segments.
  let gi = 0;
  let pi = 0;
  while (gi < gs.length) {
    if (gs[gi] === '*') {
      // * matches zero or more non-slash characters.
      let consumed = 0;
      while (pi + consumed < ps.length && ps[pi + consumed] !== '/') {
        consumed++;
      }
      // * in a multi-char segment requires at least one char.
      // But if * is the entire segment, it matches zero chars.
      if (consumed === 0 && gs.length > 1) return false;
      pi += consumed;
      gi++;
    } else {
      if (ps[pi] !== gs[gi]) return false;
      gi++;
      pi++;
    }
  }
  return pi === ps.length;
}

function matchRec(
  globSegs: readonly string[],
  g: number,
  pathSegs: readonly string[],
  p: number,
): boolean {
  while (g < globSegs.length) {
    const gs = globSegs[g];
    if (gs === undefined) return false;

    if (gs === '**') {
      // Trailing ** (nothing after it in the glob)?
      if (g + 1 >= globSegs.length) {
        // ** at end — consume all remaining path segments.
        return true;
      }
      // Middle ** — try consuming 0, 1, 2, ... path segments.
      const nextGlobSeg = globSegs[g + 1];
      for (let skip = 0; p + skip <= pathSegs.length; skip++) {
        // Only access pathSegs within bounds
        if (p + skip >= pathSegs.length) {
          // ** matches the empty suffix (zero segments remaining)
          if (nextGlobSeg && matchSeg(nextGlobSeg, '')) {
            if (matchRec(globSegs, g + 2, pathSegs, p + skip + 1)) return true;
          }
          continue;
        }
        const pathSegForNext = pathSegs[p + skip] ?? '';
        if (nextGlobSeg && matchSeg(nextGlobSeg, pathSegForNext)) {
          // Found a match: skip path segments (0 = ** matches nothing,
          // 1 = ** matches one segment, etc.) then continue.
          if (matchRec(globSegs, g + 2, pathSegs, p + skip + 1)) return true;
        }
      }
      return false;
    }

    // Literal or * segment.
    if (p >= pathSegs.length) return false;
    const pathSeg = pathSegs[p];
    if (pathSeg === undefined) return false;
    if (!matchSeg(gs, pathSeg)) return false;
    g++;
    p++;
  }

  // All glob segments consumed. Path must also be fully consumed.
  return p === pathSegs.length;
}

export function validateScope(
  manifest: Manifest,
  changedPaths: readonly string[],
): { ok: true } | { ok: false; violations: ScopeViolation[] } {
  const violations: ScopeViolation[] = [];
  for (const p of changedPaths) {
    if (p.trim().length === 0) continue;
    if (manifest.forbiddenPaths.some((g) => matchesGlob(g, p))) {
      violations.push({ path: p, reason: 'FORBIDDEN' });
      continue;
    }
    if (manifest.allowedPaths.length > 0 && !manifest.allowedPaths.some((g) => matchesGlob(g, p))) {
      violations.push({ path: p, reason: 'OUTSIDE_ALLOWED' });
    }
  }
  if (violations.length === 0) return { ok: true };
  return { ok: false, violations };
}
