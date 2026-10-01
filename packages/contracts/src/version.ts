/**
 * Canonical API version constants shared across packages.
 *
 * Document 17 §1: every public endpoint is versioned under /api/v1.
 */
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const API_TITLE = 'FASTFOOD API';

/**
 * Published API contract version.
 *
 * This is the version of the wire contract, not a release number: it tracks
 * `API_PREFIX` above and only changes together with it. Every place that
 * reports or documents the API version reads this constant, because the three
 * used to disagree — `/version` and the runtime Swagger document said
 * `0.0.0-phase0` while the committed `docs/openapi/openapi.json` said
 * `0.0.0-phase3`.
 */
export const API_CONTRACT_VERSION = '1.0.0';

export const API_DESCRIPTION = [
  'Canonical OpenAPI document, generated from the Nest application definition.',
  'The response envelope follows document 40 (success / list / error) and the',
  'canonical error code groups from @fastfood/contracts.',
  'Health probes and this document are served outside the versioned prefix.',
].join(' ');

/** Current domain event schema version, surfaced for outbox/versioned events. */
export const DOMAIN_EVENT_VERSION = 1;
