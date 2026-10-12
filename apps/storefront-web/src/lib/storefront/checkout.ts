import { createStorefrontClient, getCustomerId, sessionHeaders } from '../api';
import { getDeliveryLocation } from '../delivery-location';
import {
  branchesResponseSchema,
  checkoutSlotsResponseSchema,
  loyaltyResponseSchema,
  orderConfirmationResponseSchema,
  paymentInitResponseSchema,
  paymentMethodsResponseSchema,
  paymentStatusResponseSchema,
  quoteResponseSchema,
} from '../schemas';

import { getStoredCouponCode } from './promotions';

export type FulfillmentMode = 'DELIVERY' | 'PICKUP';

export interface CheckoutQuoteBody {
  fulfillmentMode: FulfillmentMode;
  latitude?: number;
  longitude?: number;
  pickupBranchId?: string;
  couponCode?: string;
  loyaltyRequestedMinor?: string;
  loyaltyAvailablePoints?: string;
  tipMinor?: string;
  scheduledFor?: string | null;
  ecoPackaging?: boolean;
  contactless?: boolean;
  buildingAccessCode?: string | null;
  deliveryNote?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  checkoutSessionId?: string;
  addressLabel?: string | null;
}

export async function fetchCheckoutQuote(body: CheckoutQuoteBody) {
  const client = createStorefrontClient();
  const coupon = body.couponCode ?? (typeof window !== 'undefined' ? getStoredCouponCode() : '');
  const payload: Record<string, unknown> = { ...body };
  if (coupon) payload.couponCode = coupon;
  const res = await client.request({
    method: 'POST',
    path: 'checkout/quote',
    headers: sessionHeaders(),
    body: payload,
    schema: quoteResponseSchema,
  });
  return res.data;
}

export async function fetchCheckoutSlots(branchId: string) {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'checkout/slots',
    query: { branchId },
    schema: checkoutSlotsResponseSchema,
  });
  return res.data;
}

export async function fetchPaymentMethods() {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'checkout/payment-methods',
    schema: paymentMethodsResponseSchema,
  });
  return res.data;
}

export async function fetchStorefrontBranches() {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'storefront/branches',
    schema: branchesResponseSchema,
  });
  return res.data;
}

export async function fetchLoyaltyBalance(): Promise<string | null> {
  if (!getCustomerId()) return null;
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'checkout/loyalty/balance',
    headers: sessionHeaders(),
    schema: loyaltyResponseSchema,
  });
  return res.data.points;
}

export async function initializeCheckoutPayment(input: {
  checkoutSessionId: string;
  amountMinor: string;
  currency: string;
}) {
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'checkout/payment/initialize',
    headers: sessionHeaders(),
    body: {
      checkoutSessionId: input.checkoutSessionId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      idempotencyKey: `sf-${input.checkoutSessionId}`,
      paymentMethodCode: 'iyzico_hosted',
      returnChannel: 'web',
    },
    schema: paymentInitResponseSchema,
  });
  return res.data;
}

export async function fetchPaymentStatus(checkoutSessionId: string) {
  const client = createStorefrontClient();
  const res = await client.request({
    path: `checkout/status/${checkoutSessionId}`,
    headers: sessionHeaders(),
    schema: paymentStatusResponseSchema,
  });
  return res.data;
}

export async function fetchOrderConfirmation(orderId: string) {
  const client = createStorefrontClient();
  const res = await client.request({
    path: `checkout/orders/${orderId}`,
    headers: sessionHeaders(),
    schema: orderConfirmationResponseSchema,
  });
  return res.data;
}

export async function startCheckoutPayment(): Promise<{
  checkoutSessionId: string;
  redirectUrl: string | null;
}> {
  const loc = getDeliveryLocation();
  if (!loc.serviceable) {
    throw new Error('Teslimat adresi doğrulanmadı. Konum seçin.');
  }
  const quote = await fetchCheckoutQuote({
    fulfillmentMode: 'DELIVERY',
    latitude: loc.latitude,
    longitude: loc.longitude,
  });
  if (!quote.checkoutSessionId) {
    throw new Error('Checkout oturumu oluşturulamadı.');
  }
  if (!quote.minimumOrderEligible) {
    throw new Error('Minimum sipariş tutarı karşılanmadı.');
  }
  const init = await initializeCheckoutPayment({
    checkoutSessionId: quote.checkoutSessionId,
    amountMinor: quote.finalPayableMinor,
    currency: quote.currency,
  });
  return { checkoutSessionId: quote.checkoutSessionId, redirectUrl: init.redirectUrl ?? null };
}
