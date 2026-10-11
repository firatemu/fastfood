export type DeviceLocationPoint = { latitude: number; longitude: number };

export type DeviceLocationErrorCode = 'permission-denied' | 'unavailable' | 'invalid';

export class DeviceLocationError extends Error {
  constructor(
    readonly code: DeviceLocationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DeviceLocationError';
  }
}

/** Injectable slice of `expo-location` so the flow can be tested without a device. */
export type DeviceLocationClient = {
  requestPermission: () => Promise<{ granted: boolean }>;
  currentPosition: () => Promise<DeviceLocationPoint>;
};

const MESSAGES: Record<DeviceLocationErrorCode, string> = {
  'permission-denied': 'Konum izni verilmedi. Telefon ayarlarından konum iznini açıp tekrar dene.',
  unavailable: 'Konum şu anda alınamadı. Tekrar dene veya haritadan elle seç.',
  invalid: 'Cihazdan geçerli bir konum okunamadı.',
};

async function expoLocationClient(): Promise<DeviceLocationClient> {
  const Location = await import('expo-location');
  return {
    async requestPermission() {
      const response = await Location.requestForegroundPermissionsAsync();
      return { granted: response.status === 'granted' };
    },
    async currentPosition() {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { latitude: position.coords.latitude, longitude: position.coords.longitude };
    },
  };
}

function isValidPoint(point: DeviceLocationPoint): boolean {
  return (
    Number.isFinite(point.latitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    Number.isFinite(point.longitude) &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

/**
 * Read the current position from the device. The permission prompt is always
 * requested from a user gesture; a denied permission never reads a position.
 */
export async function getDeviceLocation(
  client?: DeviceLocationClient,
): Promise<DeviceLocationPoint> {
  const source = client ?? (await expoLocationClient());
  const permission = await source.requestPermission();
  if (!permission.granted) {
    throw new DeviceLocationError('permission-denied', MESSAGES['permission-denied']);
  }

  let point: DeviceLocationPoint;
  try {
    point = await source.currentPosition();
  } catch {
    throw new DeviceLocationError('unavailable', MESSAGES.unavailable);
  }

  if (!isValidPoint(point)) throw new DeviceLocationError('invalid', MESSAGES.invalid);
  return point;
}

export function deviceLocationMessage(error: unknown): string {
  return error instanceof DeviceLocationError ? error.message : MESSAGES.unavailable;
}
