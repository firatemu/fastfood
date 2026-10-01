import { getApiClient } from './api';
import { setStoredCouponCode } from './coupon-store';
import { promotionValidateResponseSchema, type PromotionValidate } from './schemas';

export async function validateCoupon(code: string): Promise<PromotionValidate> {
  const res = await getApiClient().request({
    method: 'GET',
    path: '/storefront/promotions/validate',
    query: { code: code.trim() },
    schema: promotionValidateResponseSchema,
  });
  setStoredCouponCode(res.data.code);
  return res.data;
}
