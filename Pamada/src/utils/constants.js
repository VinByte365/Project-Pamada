import { Platform } from 'react-native';

// Backend port (must match backend .env PORT)
const API_PORT = 8000;

// Set this when testing on a physical device (same Wi-Fi as your computer). Example: 'http://192.168.1.100:8000'
const DEV_HOST_IP = 'https://elritch-shavonne-deflectable.ngrok-free.dev';

/**
 * API base URL for the Express backend.
 * - Android emulator: 10.0.2.2 is the host machine's localhost
 * - iOS simulator: localhost works
 * - Physical device: set DEV_HOST_IP above to your computer's IP (e.g. 'http://192.168.1.100:8000')
 */
export const API_BASE_URL = (() => {
  if (DEV_HOST_IP) return DEV_HOST_IP;
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${API_PORT}`;
    }
    return `http://192.168.175.89:${API_PORT}`;
  }
  return 'https://your-api-domain.com';
})();

export const ROLES = [
  { value: 'grower', label: 'Grower' },
  { value: 'admin', label: 'Admin' },
];