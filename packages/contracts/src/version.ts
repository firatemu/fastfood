/**
 * Canonical API version constants shared across packages.
 *
 * Document 17 §1: every public endpoint is versioned under /api/v1.
 */
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

/** Current domain event schema version, surfaced for outbox/versioned events. */
export const DOMAIN_EVENT_VERSION = 1;
