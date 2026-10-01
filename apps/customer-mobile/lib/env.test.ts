import { describe, expect, it } from 'vitest';

import { getApiBaseUrl } from './env.js';

describe('getApiBaseUrl', () => {
  it('defaults to the local API v1 base', () => {
    expect(getApiBaseUrl()).toBe('http://localhost:4000/api/v1');
  });
});
