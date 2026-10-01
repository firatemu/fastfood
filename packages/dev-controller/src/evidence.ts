import type { Evidence } from './schema.js';
import { EvidenceSchema } from './schema.js';
import { failResult, okResult, type ControllerResult } from './schema.js';

/**
 * Validation of a verification-evidence record.
 *
 * Rejects:
 *  - PASS with non-zero exitCode
 *  - PASS without non-empty command evidence
 *  - any structural schema violation
 *
 * Returns the parsed evidence on success.
 */
export function validateEvidence(input: unknown): ControllerResult {
  const result = EvidenceSchema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    return failResult(
      'EVIDENCE_INVALID',
      `evidence rejected: ${first?.path.join('.') ?? '?'} — ${first?.message ?? 'invalid'}`,
    );
  }
  return okResult('EVIDENCE_ACCEPTED', 'evidence accepted', { evidence: result.data });
}

export function summarizeEvidence(ev: Evidence): string {
  const dur = Math.max(0, new Date(ev.finishedAt).getTime() - new Date(ev.startedAt).getTime());
  return `${ev.result} exit=${ev.exitCode} dur=${dur}ms cmd=${ev.command.slice(0, 80)}`;
}
