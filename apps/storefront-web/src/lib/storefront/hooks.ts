'use client';

import { useCallback, useState } from 'react';

import { getCustomerId } from '../api';

import { requestCustomerOtp, verifyCustomerOtp } from './auth';
import { addDefaultVitrineToCart, addProductToCart, cartItemCount, fetchCart } from './cart';
import { productIdByVitrineIndex } from './catalog';
import { startCheckoutPayment } from './checkout';

export function useCustomerAuth() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOtp = useCallback(async (phone: string) => {
    setBusy(true);
    setError(null);
    try {
      await requestCustomerOtp(phone);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OTP gönderilemedi');
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    setBusy(true);
    setError(null);
    try {
      return await verifyCustomerOtp(phone, code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Doğrulama başarısız');
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  return { requestOtp, verifyOtp, busy, error };
}

export function useStorefrontCart() {
  const refresh = useCallback(async () => fetchCart(), []);
  const addByProductId = useCallback(async (productId: string) => addProductToCart(productId), []);
  const addDefault = useCallback(async () => addDefaultVitrineToCart(), []);
  return { refresh, addByProductId, addDefault, cartItemCount };
}

export function useCatalogProducts() {
  const resolveIndex = useCallback(async (index: number) => productIdByVitrineIndex(index), []);
  return { resolveIndex };
}

export function useCheckoutBridge() {
  const [busy, setBusy] = useState(false);
  const startPayment = useCallback(async () => {
    setBusy(true);
    try {
      return await startCheckoutPayment();
    } finally {
      setBusy(false);
    }
  }, []);
  return { startPayment, busy };
}

export function useCustomerId(): string | undefined {
  return typeof window !== 'undefined' ? getCustomerId() : undefined;
}
