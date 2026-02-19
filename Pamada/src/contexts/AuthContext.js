import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../utils/api';

const AuthContext = createContext(null);

const USER_KEY = '@pamada_user';
const TOKEN_KEY = '@pamada_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [rawUser, storedToken] = await Promise.all([
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(TOKEN_KEY),
        ]);

        let hydrated = false;
        if (storedToken) {
          setToken(storedToken);
          try {
            const me = await apiRequest('/api/v1/auth/me', {
              method: 'GET',
              token: storedToken,
            });
            if (isMounted) {
              setUser(me?.data?.user || null);
              await AsyncStorage.setItem(USER_KEY, JSON.stringify(me?.data?.user || null));
            }
            hydrated = true;
          } catch (error) {
            await AsyncStorage.multiRemove([USER_KEY, TOKEN_KEY]);
            if (isMounted) {
              setUser(null);
              setToken(null);
            }
          }
        }

        if (!hydrated && rawUser && storedToken) {
          const parsed = JSON.parse(rawUser);
          if (isMounted) setUser(parsed);
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
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
    const response = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const nextUser = response?.data?.user;
    const nextToken = response?.data?.token;

    if (!nextUser || !nextToken) {
      throw new Error('Login failed. Please check your credentials.');
    }

    setUser(nextUser);
    setToken(nextToken);
    await AsyncStorage.multiSet([
      [USER_KEY, JSON.stringify(nextUser)],
      [TOKEN_KEY, nextToken],
    ]);
  };

  const register = async ({ email, password, full_name, role, phone }) => {
    if (!email || !password || !full_name) {
      throw new Error('Please complete all required fields.');
    }
    const response = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name,
        role: role || 'grower',
        phone,
      }),
    });

    const nextUser = response?.data?.user;
    const nextToken = response?.data?.token;

    if (!nextUser || !nextToken) {
      throw new Error('Registration failed. Please try again.');
    }

    setUser(nextUser);
    setToken(nextToken);
    await AsyncStorage.multiSet([
      [USER_KEY, JSON.stringify(nextUser)],
      [TOKEN_KEY, nextToken],
    ]);
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove([USER_KEY, TOKEN_KEY]);
  };

  const refreshUser = async () => {
    if (!token) return null;
    const me = await apiRequest('/api/v1/auth/me', {
      method: 'GET',
      token,
    });
    const nextUser = me?.data?.user || null;
    setUser(nextUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    return nextUser;
  };

  const setCurrentUser = async (nextUser) => {
    setUser(nextUser || null);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser || null));
  };

  const value = useMemo(
    () => ({
      user,
      initializing,
      login,
      register,
      logout,
      refreshUser,
      setCurrentUser,
      isAuthenticated: Boolean(user),
      token,
    }),
    [user, initializing, token]
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
