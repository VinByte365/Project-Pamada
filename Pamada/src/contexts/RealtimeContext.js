import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { apiRequest } from '../utils/api';
import { SOCKET_URL } from '../utils/constants';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setSocket((current) => {
        if (current) current.disconnect();
        return null;
      });
      setNotifications([]);
      return;
    }

    const client = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
    });

    client.on('notification:new', (notification) => {
      setNotifications((prev) => [normalizeNotification(notification), ...prev]);
    });

    setSocket(client);

    return () => {
      client.disconnect();
    };
  }, [isAuthenticated, token]);

  const normalizeNotification = (item) => ({
    id: item.id || item._id,
    type: item.type,
    reference_id: item.reference_id || '',
    message: item.message,
    is_read: Boolean(item.is_read),
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
  });

  const fetchNotifications = async () => {
    if (!token) return;
    const response = await apiRequest('/api/v1/community/notifications', {
      method: 'GET',
      token,
    });
    const list = response?.data?.notifications || [];
    setNotifications(list.map(normalizeNotification));
  };

  const markRead = async (notificationId) => {
    if (!token) return;
    await apiRequest(`/api/v1/community/notifications/${notificationId}/read`, {
      method: 'PUT',
      token,
    });
    setNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item))
    );
  };

  const markAllRead = async () => {
    if (!token) return;
    await apiRequest('/api/v1/community/notifications/read-all', {
      method: 'PUT',
      token,
    });
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchNotifications().catch(() => {});
    }
  }, [isAuthenticated, token]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const value = useMemo(
    () => ({
      socket,
      notifications,
      unreadCount,
      fetchNotifications,
      markRead,
      markAllRead,
    }),
    [socket, notifications, unreadCount]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
}
