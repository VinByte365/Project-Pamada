import { API_BASE_URL, API_FALLBACK_BASE_URL } from './constants';

const NETWORK_ERROR_MESSAGE =
  'Cannot reach server. Check that the backend is running (e.g. npm start in backend/) and set EXPO_PUBLIC_API_BASE_URL / EXPO_PUBLIC_API_FALLBACK_BASE_URL for your device network.';
const DEFAULT_TIMEOUT_MS = 25000;
const DEFAULT_UPLOAD_TIMEOUT_MS = 600000;
const MAX_RESPONSE_PREVIEW = 260;

const isHtmlText = (value) => /<!doctype html|<html[\s>]|<head[\s>]|<body[\s>]/i.test(String(value || ''));
const isNgrokError = (value) => /ERR_NGROK_8012|ERR_NGROK_3004/i.test(String(value || ''));

const toPreviewText = (value) => {
  const raw = String(value || '');
  if (!raw) return '';
  if (isHtmlText(raw)) {
    const ngrokCode = raw.match(/ERR_NGROK_\d+/i)?.[0];
    return ngrokCode ? ngrokCode.toUpperCase() : 'Unexpected HTML response';
  }
  return raw.length > MAX_RESPONSE_PREVIEW
    ? `${raw.slice(0, MAX_RESPONSE_PREVIEW)}...`
    : raw;
};

const getFriendlyFailureMessage = ({ status, responseText, statusText, parsedData }) => {
  const text = String(responseText || parsedData?.message || parsedData?.error || '');
  if (text.match(/ERR_NGROK_8012/i)) {
    return 'Tunnel is reachable, but backend service is offline (ERR_NGROK_8012). Start backend on port 8000 and restart ngrok.';
  }
  if (text.match(/ERR_NGROK_3004/i)) {
    return 'Ngrok gateway error (ERR_NGROK_3004). Restart ngrok or switch API URL to your LAN backend.';
  }
  if (isHtmlText(text)) {
    return 'Received an HTML error page instead of API JSON. Check backend URL and tunnel.';
  }
  return (
    (parsedData && (parsedData.error || parsedData.message)) ||
    statusText ||
    `Request failed (${status})`
  );
};

const canUseFallbackBase = (activeBaseUrl, allowFallback) =>
  Boolean(
    allowFallback &&
      API_FALLBACK_BASE_URL &&
      activeBaseUrl &&
      API_FALLBACK_BASE_URL !== activeBaseUrl
  );

/**
 * Base fetch helper with JSON headers and optional auth token.
 */
export async function apiRequest(endpoint, options = {}) {
  if (!endpoint || typeof endpoint !== 'string') {
    const invalidEndpointError = new Error('Invalid API endpoint');
    invalidEndpointError.code = 'INVALID_ENDPOINT';
    throw invalidEndpointError;
  }

  const {
    timeoutMs: timeoutOverride,
    token,
    headers: customHeaders,
    baseUrl: baseUrlOverride,
    allowFallback = true,
    ...fetchOptions
  } = options;
  const isAbsoluteEndpoint = endpoint.startsWith('http');
  const activeBaseUrl = baseUrlOverride || API_BASE_URL;
  const url = isAbsoluteEndpoint ? endpoint : `${activeBaseUrl}${endpoint}`;
  const isFormData =
    typeof FormData !== 'undefined' &&
    fetchOptions.body &&
    fetchOptions.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...customHeaders,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const timeoutMs = Number(timeoutOverride || (isFormData ? DEFAULT_UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS));
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutError = new Error(`Request timed out after ${timeoutMs}ms`);
      timeoutError.code = 'TIMEOUT';
      timeoutError.status = 408;
      throw timeoutError;
    }
    const isNetworkError =
      err.message === 'Network request failed' ||
      err.name === 'TypeError' ||
      (err.message && err.message.includes('Network'));
    if (!isAbsoluteEndpoint && canUseFallbackBase(activeBaseUrl, allowFallback)) {
      return apiRequest(endpoint, {
        ...options,
        baseUrl: API_FALLBACK_BASE_URL,
        allowFallback: false,
      });
    }
    const networkError = new Error(isNetworkError ? NETWORK_ERROR_MESSAGE : err.message || 'Request failed');
    networkError.code = isNetworkError ? 'NETWORK_ERROR' : 'REQUEST_FAILED';
    throw networkError;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const responseText = await response.text().catch(() => '');
  let data = {};
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { message: toPreviewText(responseText) };
    }
  }

  if (response.ok && isHtmlText(responseText)) {
    if (!isAbsoluteEndpoint && canUseFallbackBase(activeBaseUrl, allowFallback)) {
      return apiRequest(endpoint, {
        ...options,
        baseUrl: API_FALLBACK_BASE_URL,
        allowFallback: false,
      });
    }
    const htmlResponseError = new Error(
      'Received an HTML page instead of API JSON. Check backend URL or tunnel status.'
    );
    htmlResponseError.code = 'INVALID_API_RESPONSE';
    htmlResponseError.status = response.status;
    throw htmlResponseError;
  }

  if (!response.ok) {
    if (
      !isAbsoluteEndpoint &&
      canUseFallbackBase(activeBaseUrl, allowFallback) &&
      (isNgrokError(responseText) || response.status >= 500)
    ) {
      return apiRequest(endpoint, {
        ...options,
        baseUrl: API_FALLBACK_BASE_URL,
        allowFallback: false,
      });
    }
    const message = getFriendlyFailureMessage({
      status: response.status,
      responseText,
      statusText: response.statusText,
      parsedData: data,
    });
    const error = new Error(message);
    error.status = response.status;
    error.code =
      data?.code ||
      (response.status === 400 ? 'INVALID_INPUT' : null) ||
      (response.status === 401 ? 'UNAUTHORIZED' : null) ||
      (response.status === 403 ? 'FORBIDDEN' : null) ||
      (response.status === 404 ? 'NOT_FOUND' : null) ||
      (response.status === 408 ? 'TIMEOUT' : null) ||
      (response.status === 409 ? 'CONFLICT' : null) ||
      (response.status === 422 ? 'VALIDATION_ERROR' : null) ||
      (response.status === 429 ? 'RATE_LIMIT' : null) ||
      (response.status >= 500 ? 'SERVER_ERROR' : 'REQUEST_FAILED');
    error.data = data;
    throw error;
  }
  return data;
}
