import { Redirect } from 'expo-router';

import { getCourierSession } from '../lib/session';

/**
 * Entry — authenticated couriers land on deliveries; others on login.
 */
export default function IndexScreen() {
  if (getCourierSession()) {
    return <Redirect href="/deliveries" />;
  }
  return <Redirect href="/login" />;
}
