'use client';

import type { CourierMeProfile } from '@fastfood/contracts';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { z } from 'zod';

import {
  api,
  authResponse,
  meProfileResponseSchema,
  refreshResponse,
  setAccessToken,
} from '../lib/api';

type Session = {
  ready: boolean;
  signedIn: boolean;
  userId?: string;
  profile: CourierMeProfile | null;
  refreshProfile: () => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Context = createContext<Session | null>(null);
const logoutResponse = z.object({
  data: z.object({ ok: z.boolean() }),
  meta: z.unknown().optional(),
});
const DEVELOPMENT_MFA_BYPASS_CODE = '000000';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string>();
  const [profile, setProfile] = useState<CourierMeProfile | null>(null);
  const router = useRouter();

  const refreshProfile = useCallback(async () => {
    try {
      const res = await api.request({
        path: '/courier/me',
        schema: meProfileResponseSchema,
      });
      setProfile(res.data);
    } catch {
      // Non-fatal: individual pages display actionable empty/error states if /courier/me fails.
    }
  }, []);

  useEffect(() => {
    api
      .request({ method: 'POST', path: '/auth/staff/refresh', body: {}, schema: refreshResponse })
      .then(async ({ data }) => {
        setAccessToken(data.accessToken);
        setUserId(data.userId);
        await refreshProfile();
      })
      .catch(() => {
        setAccessToken(undefined);
        setProfile(null);
      })
      .finally(() => setReady(true));
  }, [refreshProfile]);

  async function signIn(identifier: string, password: string) {
    const loginRes = await api.request({
      method: 'POST',
      path: '/auth/staff/login',
      body: { identifier, password },
      schema: authResponse,
    });
    const mfaRes = await api.request({
      method: 'POST',
      path: '/auth/staff/mfa/verify',
      body: loginRes.data.refreshToken
        ? { refreshToken: loginRes.data.refreshToken, totp: DEVELOPMENT_MFA_BYPASS_CODE }
        : { totp: DEVELOPMENT_MFA_BYPASS_CODE },
      schema: authResponse,
    });
    if (mfaRes.data.accessToken) {
      setAccessToken(mfaRes.data.accessToken);
      setUserId(mfaRes.data.userId);
      setReady(true);
      await refreshProfile();
      router.replace('/deliveries');
      return;
    }
    const renewed = await api.request({
      method: 'POST',
      path: '/auth/staff/refresh',
      body: {},
      schema: refreshResponse,
    });
    setAccessToken(renewed.data.accessToken);
    setUserId(renewed.data.userId);
    setReady(true);
    await refreshProfile();
    router.replace('/deliveries');
  }

  async function signOut() {
    try {
      await api.request({
        method: 'POST',
        path: '/auth/staff/logout',
        body: {},
        schema: logoutResponse,
      });
    } catch {
      // Complete local sign-out even when the network is unavailable.
    }
    setAccessToken(undefined);
    setUserId(undefined);
    setProfile(null);
    router.replace('/login');
  }

  return (
    <Context.Provider
      value={{
        ready,
        signedIn: Boolean(userId),
        userId,
        profile,
        refreshProfile,
        signIn,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error('SessionProvider is missing');
  return value;
}
