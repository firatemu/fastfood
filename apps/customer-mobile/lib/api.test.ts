import { ApiError } from '@fastfood/api-client';
import { describe, expect, it } from 'vitest';

import { formatApiError } from './api';

const REQUEST_ID = '01900000-0000-7000-8000-aaaaaaaaaaaa';

describe('formatApiError', () => {
  it('maps auth envelopes to customer copy', () => {
    const err = new ApiError(401, {
      error: { code: 'AUTH_UNAUTHENTICATED', message: 'nope', requestId: REQUEST_ID },
    });
    expect(formatApiError(err)).toBe('Oturum gerekli. Lütfen giriş yapın.');
  });

  it('maps English INTERNAL_ERROR envelopes to Turkish', () => {
    const err = new ApiError(500, {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        requestId: REQUEST_ID,
      },
    });
    expect(formatApiError(err)).toBe('Beklenmeyen bir hata oluştu. Tekrar deneyin.');
  });
});
