import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, API_FALLBACK_BASE_URL } from '../utils/constants';

const CommunityPostUploadContext = createContext(null);
const UPLOAD_TIMEOUT_MS = 600000;
const RETRY_DELAY_MS = 1500;

const buildError = (message, code = 'REQUEST_FAILED', status = 500) => {
  const error = new Error(message || 'Request failed');
  error.code = code;
  error.status = status;
  return error;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientUploadError = (error) => {
  const text = String(error?.message || '').toLowerCase();
  if (error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT') return true;
  return (
    text.includes('err_ngrok_3004') ||
    text.includes('ngrok gateway error') ||
    text.includes('incomplete http response') ||
    text.includes('network')
  );
};

const shouldUseFallbackBase = () => {
  if (!API_FALLBACK_BASE_URL || !API_BASE_URL) return false;
  return API_FALLBACK_BASE_URL !== API_BASE_URL;
};

const requestWithXhr = ({
  endpoint,
  method = 'POST',
  token,
  body,
  isFormData = false,
  timeoutMs = UPLOAD_TIMEOUT_MS,
  onProgress,
  baseUrl = API_BASE_URL,
}) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    xhr.open(method, url);
    xhr.responseType = 'text';
    xhr.timeout = timeoutMs;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    if (!isFormData) xhr.setRequestHeader('Content-Type', 'application/json');

    if (typeof onProgress === 'function' && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (!event?.lengthComputable || event.total <= 0) return;
        onProgress(Math.max(1, Math.min(95, Math.round((event.loaded / event.total) * 100))));
      };
    }

    xhr.onload = () => {
      let parsed = {};
      try {
        parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch (e) {
        parsed = { message: xhr.responseText || '' };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed);
        return;
      }

      reject(
        buildError(
          parsed?.error || parsed?.message || `Request failed (${xhr.status})`,
          xhr.status === 408 ? 'TIMEOUT' : 'REQUEST_FAILED',
          xhr.status
        )
      );
    };

    xhr.onerror = () => {
      reject(buildError('Network request failed', 'NETWORK_ERROR', 0));
    };

    xhr.ontimeout = () => {
      reject(buildError(`Request timed out after ${timeoutMs}ms`, 'TIMEOUT', 408));
    };

    xhr.send(body);
  });

export function CommunityPostUploadProvider({ children }) {
  const [upload, setUpload] = useState({
    id: null,
    status: 'idle',
    progress: 0,
    message: '',
    error: '',
    startedAt: null,
  });
  const clearTimerRef = useRef(null);
  const activeRef = useRef(false);

  const clearUpload = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    activeRef.current = false;
    setUpload({
      id: null,
      status: 'idle',
      progress: 0,
      message: '',
      error: '',
      startedAt: null,
    });
  }, []);

  useEffect(
    () => () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
    },
    []
  );

  const startPostUpload = useCallback(async ({ token, content, mediaUrl, pickedMedia }) => {
    if (activeRef.current) {
      throw buildError('Another post is still uploading. Please wait.', 'CONFLICT', 409);
    }

    const uploadId = `post-${Date.now()}`;
    activeRef.current = true;
    setUpload({
      id: uploadId,
      status: 'uploading',
      progress: 0,
      message: 'Uploading post...',
      error: '',
      startedAt: Date.now(),
    });

    const sendUpload = async (baseUrl) => {
      if (pickedMedia) {
        const formData = new FormData();
        formData.append('content', content || '');
        formData.append('media', {
          uri: pickedMedia.uri,
          name: pickedMedia.fileName || `community-${Date.now()}.${pickedMedia.mimeType?.includes('video') ? 'mp4' : 'jpg'}`,
          type: pickedMedia.mimeType || 'image/jpeg',
        });
        return requestWithXhr({
          endpoint: '/api/v1/community/posts',
          method: 'POST',
          token,
          body: formData,
          isFormData: true,
          timeoutMs: UPLOAD_TIMEOUT_MS,
          baseUrl,
          onProgress: (progress) => {
            setUpload((prev) => (prev.id === uploadId ? { ...prev, progress } : prev));
          },
        });
      }

      setUpload((prev) => (prev.id === uploadId ? { ...prev, progress: 40, message: 'Publishing post...' } : prev));
      return requestWithXhr({
        endpoint: '/api/v1/community/posts',
        method: 'POST',
        token,
        body: JSON.stringify({ content: content || '', media_url: mediaUrl || '' }),
        timeoutMs: UPLOAD_TIMEOUT_MS,
        baseUrl,
      });
    };

    try {
      let response;
      try {
        response = await sendUpload(API_BASE_URL);
      } catch (firstError) {
        if (!isTransientUploadError(firstError)) throw firstError;
        const useFallback = shouldUseFallbackBase();
        const retryMessage = useFallback
          ? 'Upload interrupted, switching to local network...'
          : 'Upload interrupted, retrying once...';
        setUpload((prev) => (prev.id === uploadId ? { ...prev, message: retryMessage } : prev));
        await delay(RETRY_DELAY_MS);
        response = await sendUpload(useFallback ? API_FALLBACK_BASE_URL : API_BASE_URL);
      }

      setUpload((prev) =>
        prev.id === uploadId
          ? {
              ...prev,
              status: 'success',
              progress: 100,
              message: 'Post published.',
              error: '',
            }
          : prev
      );

      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        clearUpload();
      }, 2200);

      return response;
    } catch (error) {
      setUpload((prev) =>
        prev.id === uploadId
          ? {
              ...prev,
              status: 'error',
              message: 'Upload failed',
              error: error.message || 'Failed to publish post',
            }
          : prev
      );
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        clearUpload();
      }, 4500);
      throw error;
    } finally {
      activeRef.current = false;
    }
  }, [clearUpload]);

  const value = useMemo(
    () => ({
      upload,
      isUploading: upload.status === 'uploading',
      startPostUpload,
      clearUpload,
    }),
    [clearUpload, startPostUpload, upload]
  );

  return <CommunityPostUploadContext.Provider value={value}>{children}</CommunityPostUploadContext.Provider>;
}

export function useCommunityPostUpload() {
  const context = useContext(CommunityPostUploadContext);
  if (!context) {
    throw new Error('useCommunityPostUpload must be used within CommunityPostUploadProvider');
  }
  return context;
}
