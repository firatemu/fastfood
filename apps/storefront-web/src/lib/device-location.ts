export type DeviceLocationPoint = { latitude: number; longitude: number };

export type DeviceLocationErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'unavailable'
  | 'timeout'
  | 'invalid';

export class DeviceLocationError extends Error {
  constructor(
    readonly code: DeviceLocationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DeviceLocationError';
  }
}

/** Minimal slice of the W3C Geolocation API so the source can be faked in tests. */
export type GeolocationLike = {
  getCurrentPosition(
    success: (position: { coords: { latitude: number; longitude: number } }) => void,
    error: (error: { code: number }) => void,
    options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number },
  ): void;
};

const MESSAGES: Record<DeviceLocationErrorCode, string> = {
  unsupported: 'Bu cihazda konum servisi bulunmuyor. Haritadan elle konum seçebilirsin.',
  'permission-denied': 'Konum izni verilmedi. Tarayıcı ayarlarından konum iznini açıp tekrar dene.',
  unavailable: 'Konum şu anda alınamadı. Tekrar dene veya haritadan elle seç.',
  timeout: 'Konum alma zaman aşımına uğradı. Tekrar dene.',
  invalid: 'Cihazdan geçerli bir konum okunamadı.',
};

const GEOLOCATION_ERROR_CODES: Record<number, DeviceLocationErrorCode> = {
  1: 'permission-denied',
  2: 'unavailable',
  3: 'timeout',
};

function browserGeolocation(): GeolocationLike | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator.geolocation as unknown as GeolocationLike | undefined) ?? null;
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
 * Read the current position from the browser/OS. Requires a user-granted
 * geolocation permission and a secure context (https or localhost).
 */
export async function getDeviceLocation(
  source?: GeolocationLike | null,
): Promise<DeviceLocationPoint> {
  const geolocation = source === undefined ? browserGeolocation() : source;
  if (!geolocation) throw new DeviceLocationError('unsupported', MESSAGES.unsupported);

  const point = await new Promise<DeviceLocationPoint>((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) =>
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => {
        const code = GEOLOCATION_ERROR_CODES[error.code] ?? 'unavailable';
        reject(new DeviceLocationError(code, MESSAGES[code]));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });

  if (!isValidPoint(point)) throw new DeviceLocationError('invalid', MESSAGES.invalid);
  return point;
}

export function deviceLocationMessage(error: unknown): string {
  return error instanceof DeviceLocationError ? error.message : MESSAGES.unavailable;
}
