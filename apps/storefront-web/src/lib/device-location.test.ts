import { describe, expect, it } from 'vitest';

import {
  DeviceLocationError,
  deviceLocationMessage,
  getDeviceLocation,
  type GeolocationLike,
} from './device-location';

function fakeGeolocation(result: {
  point?: { latitude: number; longitude: number };
  errorCode?: number;
}): GeolocationLike {
  return {
    getCurrentPosition(success, error) {
      if (result.errorCode !== undefined) {
        error({ code: result.errorCode });
        return;
      }
      success({ coords: result.point ?? { latitude: 0, longitude: 0 } });
    },
  };
}

describe('getDeviceLocation', () => {
  it('returns the device coordinates', async () => {
    const point = await getDeviceLocation(
      fakeGeolocation({ point: { latitude: 41.033, longitude: 29.033 } }),
    );
    expect(point).toEqual({ latitude: 41.033, longitude: 29.033 });
  });

  it('maps a denied permission to an actionable message', async () => {
    await expect(getDeviceLocation(fakeGeolocation({ errorCode: 1 }))).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('keeps unavailable and timeout distinguishable', async () => {
    await expect(getDeviceLocation(fakeGeolocation({ errorCode: 2 }))).rejects.toMatchObject({
      code: 'unavailable',
    });
    await expect(getDeviceLocation(fakeGeolocation({ errorCode: 3 }))).rejects.toMatchObject({
      code: 'timeout',
    });
  });

  it('fails honestly when the platform has no geolocation service', async () => {
    await expect(getDeviceLocation(null)).rejects.toBeInstanceOf(DeviceLocationError);
    await expect(getDeviceLocation(null)).rejects.toMatchObject({ code: 'unsupported' });
  });

  it('rejects coordinates outside valid bounds', async () => {
    await expect(
      getDeviceLocation(fakeGeolocation({ point: { latitude: 120, longitude: 29 } })),
    ).rejects.toMatchObject({ code: 'invalid' });
  });
});

describe('deviceLocationMessage', () => {
  it('keeps the user-facing message and falls back for unknown errors', () => {
    const error = new DeviceLocationError('permission-denied', 'Konum izni verilmedi.');
    expect(deviceLocationMessage(error)).toBe('Konum izni verilmedi.');
    expect(deviceLocationMessage(new Error('boom'))).toContain('Konum');
  });
});
