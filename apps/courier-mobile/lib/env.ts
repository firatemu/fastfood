/**
 * Client env for courier-mobile.
 *
 * Default targets the local API. Android emulator cannot reach the host via
 * `localhost` — use `http://10.0.2.2:4000/api/v1` (set EXPO_PUBLIC_API_BASE_URL).
 * Physical devices need the host LAN IP instead.
 */
export function getApiBaseUrl(): string {
  return process.env['EXPO_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000/api/v1';
}
