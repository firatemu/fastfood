import { getApiClient } from './api';
import { getStoredCouponCode } from './coupon-store';
import {
  getDeliveryLocation,
  setDeliveryLocation,
  type DeliveryLocation,
} from './delivery-location';
import {
  branchesResponseSchema,
  checkoutSlotsResponseSchema,
  loyaltyResponseSchema,
  orderConfirmationResponseSchema,
  paymentInitResponseSchema,
  paymentMethodsResponseSchema,
  paymentStatusResponseSchema,
  quoteResponseSchema,
  serviceabilityResponseSchema,
  type Branch,
  type CheckoutQuote,
  type OrderConfirmation,
  type PaymentInit,
  type PaymentMethod,
  type PaymentStatus,
} from './schemas';
import { getCustomerSession } from './session';

export async function fetchCheckoutQuote(body: Record<string, unknown>): Promise<CheckoutQuote> {
  const coupon = typeof body.couponCode === 'string' ? body.couponCode : getStoredCouponCode();
  const payload = { ...body };
  if (coupon) payload.couponCode = coupon;
  const res = await getApiClient().request({
    method: 'POST',
    path: '/checkout/quote',
    body: payload,
    schema: quoteResponseSchema,
  });
  return res.data;
}

export async function fetchCheckoutSlots(branchId: string) {
  const res = await getApiClient().request({
    method: 'GET',
    path: '/checkout/slots',
    query: { branchId },
    schema: checkoutSlotsResponseSchema,
  });
  return res.data;
}

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const res = await getApiClient().request({
    method: 'GET',
    path: '/checkout/payment-methods',
    schema: paymentMethodsResponseSchema,
  });
  return res.data;
}

export async function fetchStorefrontBranches(): Promise<Branch[]> {
  const res = await getApiClient().request({
    method: 'GET',
    path: '/storefront/branches',
    schema: branchesResponseSchema,
  });
  return res.data;
}

export async function checkDeliveryServiceability(
  latitude: number,
  longitude: number,
  label: string,
): Promise<DeliveryLocation> {
  const res = await getApiClient().request({
    method: 'GET',
    path: '/storefront/serviceability',
    query: { latitude: String(latitude), longitude: String(longitude) },
    schema: serviceabilityResponseSchema,
  });
  const next: DeliveryLocation = {
    label,
    latitude,
    longitude,
    serviceable: res.data.serviceable,
    branchId: res.data.branchId ?? undefined,
    serviceAreaId: res.data.serviceAreaId ?? undefined,
  };
  setDeliveryLocation(next);
  return next;
}

export async function fetchLoyaltyBalance(): Promise<string | null> {
  if (!getCustomerSession()) return null;
  const res = await getApiClient().request({
    method: 'GET',
    path: '/checkout/loyalty/balance',
    schema: loyaltyResponseSchema,
  });
  return res.data.points;
}

export async function initializeCheckoutPayment(input: {
  checkoutSessionId: string;
  amountMinor: string;
  currency: string;
  idempotencyKey: string;
}): Promise<PaymentInit> {
  const res = await getApiClient().request({
    method: 'POST',
    path: '/checkout/payment/initialize',
    idempotencyKey: input.idempotencyKey,
    body: {
      checkoutSessionId: input.checkoutSessionId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      idempotencyKey: input.idempotencyKey,
      paymentMethodCode: 'iyzico_hosted',
      returnChannel: 'mobile',
    },
    schema: paymentInitResponseSchema,
  });
  return res.data;
}

export async function fetchPaymentStatus(checkoutSessionId: string): Promise<PaymentStatus> {
  const res = await getApiClient().request({
    method: 'GET',
    path: `/checkout/status/${checkoutSessionId}`,
    schema: paymentStatusResponseSchema,
  });
  return res.data;
}

export async function fetchOrderConfirmation(orderId: string): Promise<OrderConfirmation> {
  const res = await getApiClient().request({
    method: 'GET',
    path: `/checkout/orders/${orderId}`,
    schema: orderConfirmationResponseSchema,
  });
  return res.data;
}

export { getDeliveryLocation };
