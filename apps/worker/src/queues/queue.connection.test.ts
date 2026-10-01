import { describe, expect, it } from 'vitest';

import { createQueue, getBullConnection, getRedisClient } from './queue.connection.js';

describe('worker queue helpers (foundation)', () => {
  it('exposes queue factory symbols without requiring live redis in unit context', () => {
    expect(typeof createQueue).toBe('function');
    expect(typeof getBullConnection).toBe('function');
    expect(typeof getRedisClient).toBe('function');
  });
});
