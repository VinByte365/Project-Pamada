import { API_BASE_URL } from './constants';

const NETWORK_ERROR_MESSAGE =
  'Cannot reach server. Check that the backend is running (e.g. npm start in backend/) and, if using a physical device, that API_BASE_URL in src/utils/constants.js uses your computer\'s IP.';

/**
 * Base fetch helper with JSON headers and optional auth token.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    const isNetworkError =
      err.message === 'Network request failed' ||
      err.name === 'TypeError' ||
      (err.message && err.message.includes('Network'));
    throw new Error(isNetworkError ? NETWORK_ERROR_MESSAGE : err.message || 'Request failed');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data && (data.error || data.message)) ||
      response.statusText ||
      `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}
