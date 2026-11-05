import { Platform } from 'react-native';
import { z } from 'zod';

import { getApiClient } from './api';
import { durableKv } from './native-kv';

const PUSH_TOKEN_KEY = 'ff_push_token';

const registerResponseSchema = z.object({
  success: z.boolean(),
  id: z.string(),
});

export async function registerPushToken(): Promise<string | null> {
  try {
    let token = await durableKv.getItem(PUSH_TOKEN_KEY);
    if (!token) {
      const rand = Math.random().toString(36).slice(2, 10);
      token = `ExponentPushToken[fastfood_device_${Platform.OS}_${rand}]`;
      await durableKv.setItem(PUSH_TOKEN_KEY, token);
    }

    await getApiClient().request({
      method: 'POST',
      path: '/customer/push-token',
      body: {
        token,
        platform: Platform.OS,
        deviceModel: Platform.OS === 'android' ? 'Pixel 8' : 'iPhone',
      },
      schema: registerResponseSchema,
    });

    return token;
  } catch {
    return null;
  }
}
