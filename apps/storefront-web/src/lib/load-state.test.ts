import { ApiError } from '@fastfood/api-client';
import { describe, expect, it } from 'vitest';

import { errorMessage } from './load-state';

const REQUEST_ID = '01900000-0000-7000-8000-aaaaaaaaaaaa';

describe('errorMessage', () => {
  it('maps auth envelopes to customer copy', () => {
    const err = new ApiError(401, {
      error: { code: 'AUTH_UNAUTHENTICATED', message: 'nope', requestId: REQUEST_ID },
    });
    expect(errorMessage(err)).toBe('Oturum gerekli. Lütfen giriş yapın.');
  });

  it('hides stack-like internals from the customer', () => {
    expect(errorMessage(new TypeError('Cannot read properties of undefined (reading "id")'))).toBe(
      'Beklenmeyen bir hata oluştu. Tekrar deneyin.',
    );
  });

  it('maps English INTERNAL_ERROR envelopes to Turkish', () => {
    const err = new ApiError(500, {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        requestId: REQUEST_ID,
      },
    });
    expect(errorMessage(err)).toBe('Beklenmeyen bir hata oluştu. Tekrar deneyin.');
  });

  it('keeps short API business messages', () => {
    const err = new ApiError(422, {
      error: {
        code: 'PROMOTION_INVALID',
        message: 'Kupon bu sepette geçerli değil.',
        requestId: REQUEST_ID,
      },
    });
    expect(errorMessage(err)).toBe('Kupon bu sepette geçerli değil.');
  });
});
