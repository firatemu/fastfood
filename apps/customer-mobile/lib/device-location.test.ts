import { describe, expect, it } from 'vitest';

import {
  DeviceLocationError,
  deviceLocationMessage,
  getDeviceLocation,
  type DeviceLocationClient,
} from './device-location';

function client(overrides: Partial<DeviceLocationClient> = {}): DeviceLocationClient {
  return {
    requestPermission: async () => ({ granted: true }),
    currentPosition: async () => ({ latitude: 41.033, longitude: 29.033 }),
    ...overrides,
  };
}

describe('getDeviceLocation (mobile)', () => {
  it('returns device coordinates when permission is granted', async () => {
    await expect(getDeviceLocation(client())).resolves.toEqual({
      latitude: 41.033,
      longitude: 29.033,
    });
  });

  it('never reads the position when permission is denied', async () => {
    let positionRead = false;
    const denied = client({
      requestPermission: async () => ({ granted: false }),
      currentPosition: async () => {
        positionRead = true;
        return { latitude: 0, longitude: 0 };
      },
    });
    await expect(getDeviceLocation(denied)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(positionRead).toBe(false);
  });

  it('maps a failing position read to unavailable', async () => {
    await expect(
      getDeviceLocation(
        client({
          currentPosition: async () => {
            throw new Error('gps yok');
          },
        }),
      ),
    ).rejects.toBeInstanceOf(DeviceLocationError);
  });

  it('rejects coordinates outside valid bounds', async () => {
    await expect(
      getDeviceLocation(client({ currentPosition: async () => ({ latitude: 0, longitude: 999 }) })),
    ).rejects.toMatchObject({ code: 'invalid' });
  });
});

describe('deviceLocationMessage (mobile)', () => {
  it('keeps the user-facing message and falls back for unknown errors', () => {
    const error = new DeviceLocationError('unavailable', 'Konum şu anda alınamadı.');
    expect(deviceLocationMessage(error)).toBe('Konum şu anda alınamadı.');
    expect(deviceLocationMessage(new Error('boom'))).toContain('Konum');
  });
});
