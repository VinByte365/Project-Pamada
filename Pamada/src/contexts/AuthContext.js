import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

const STORAGE_KEY = '@pamada_user';

const DEFAULT_USER = {
  id: 'demo-user',
  full_name: 'Melvin Catuera',
  email: 'farmer@pamada.app',
  role: 'grower',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (isMounted) setUser(parsed);
        }
      } catch (error) {
        if (isMounted) setUser(DEFAULT_USER);
      } finally {
        if (isMounted) setInitializing(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }
    const nextUser = {
      ...DEFAULT_USER,
      email,
      full_name: email.split('@')[0]?.replace(/\./g, ' ') || DEFAULT_USER.full_name,
    };
    setUser(nextUser);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  };

  const register = async ({ email, password, full_name, role, phone }) => {
    if (!email || !password || !full_name) {
      throw new Error('Please complete all required fields.');
    }
    const nextUser = {
      id: `user-${Date.now()}`,
      full_name,
      email,
      role: role || 'grower',
      phone,
    };
    setUser(nextUser);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      initializing,
      login,
      register,
      logout,
      isAuthenticated: Boolean(user),
    }),
    [user, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}