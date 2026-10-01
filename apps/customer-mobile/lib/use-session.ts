import { useSyncExternalStore } from 'react';

import {
  getAuthBootstrapState,
  getCustomerSession,
  subscribeBootstrap,
  subscribeSession,
  type AuthBootstrapState,
  type CustomerSession,
} from './session';

export function useCustomerSession(): CustomerSession | null {
  return useSyncExternalStore(subscribeSession, getCustomerSession, getCustomerSession);
}

export function useAuthBootstrap(): AuthBootstrapState {
  return useSyncExternalStore(subscribeBootstrap, getAuthBootstrapState, getAuthBootstrapState);
}
