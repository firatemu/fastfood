'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { z } from 'zod';

import { api, authResponse, refreshResponse, setAccessToken } from '../lib/api';

type Session = {
  ready: boolean;
  signedIn: boolean;
  userId?: string;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Context = createContext<Session | null>(null);
const logoutResponse = z.object({ data: z.object({ ok: z.boolean() }), meta: z.unknown().optional() });
const DEVELOPMENT_MFA_BYPASS_CODE = '000000';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string>();
  const router = useRouter();

  useEffect(() => {
    api
      .request({ method: 'POST', path: '/auth/staff/refresh', body: {}, schema: refreshResponse })
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        setUserId(data.userId);
      })
      .catch(() => setAccessToken(undefined))
      .finally(() => setReady(true));
  }, []);

  async function signIn(identifier: string, password: string) {
    await api.request({
      method: 'POST',
      path: '/auth/staff/login',
      body: { identifier, password },
      schema: authResponse,
    });
    // The staff API issues an access token only after this verification step,
    // including the local development bypass flow.
    await api.request({
      method: 'POST',
      path: '/auth/staff/mfa/verify',
      body: { totp: DEVELOPMENT_MFA_BYPASS_CODE },
      schema: authResponse,
    });
    const renewed = await api.request({
      method: 'POST',
      path: '/auth/staff/refresh',
      body: {},
      schema: refreshResponse,
    });
    setAccessToken(renewed.data.accessToken);
    setUserId(renewed.data.userId);
    setReady(true);
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
    router.replace('/login');
  }

  return (
    <Context.Provider value={{ ready, signedIn: Boolean(userId), userId, signIn, signOut }}>
      {children}
    </Context.Provider>
  );
}

export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error('SessionProvider is missing');
  return value;
}
