import { Platform } from 'react-native';
// Backend port (must match backend .env PORT)
const API_PORT = 8000;

// Optional override for cloud/tunnel backend URL (e.g. ngrok). Leave empty to use local dev defaults.
const DEV_HOST_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
// Optional fallback target (LAN). Example: 'http://192.168.1.100:8000'
const FALLBACK_LAN_HOST_URL =
  (process.env.EXPO_PUBLIC_API_FALLBACK_BASE_URL || 'http://192.168.175.89:8000').trim();

/**
 * API base URL for the Express backend.
 * - Android emulator: 10.0.2.2 is the host machine's localhost
 * - iOS simulator: localhost works
 * - Physical device: set EXPO_PUBLIC_API_BASE_URL in .env (or rely on EXPO_PUBLIC_API_FALLBACK_BASE_URL).
 */
export const API_BASE_URL = (() => {
  if (DEV_HOST_URL) return DEV_HOST_URL;
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${API_PORT}`;
    }
    return `http://192.168.175.89:${API_PORT}`;
  }
  return 'https://your-api-domain.com';
})();

export const API_FALLBACK_BASE_URL = FALLBACK_LAN_HOST_URL || '';

export const SOCKET_URL = API_BASE_URL;

export const ROLES = [
  { value: 'grower', label: 'Grower' },
  { value: 'admin', label: 'Admin' },
];
