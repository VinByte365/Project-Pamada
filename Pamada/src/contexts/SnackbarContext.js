import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Snackbar from '../components/common/Snackbar';

const SnackbarContext = createContext(null);

export function SnackbarProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [active, setActive] = useState(null);
  const [visible, setVisible] = useState(false);

  const showSnackbar = useCallback((payload = {}) => {
    const message = String(payload?.message || '').trim();
    if (!message) return;
    setQueue((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: payload.type || 'info',
        message,
        duration: typeof payload.duration === 'number' ? payload.duration : 3000,
        actionLabel: payload.actionLabel || undefined,
        onAction: typeof payload.onAction === 'function' ? payload.onAction : undefined,
      },
    ]);
  }, []);

  const hideSnackbar = useCallback(() => {
    setVisible(false);
  }, []);

  const handleDismiss = useCallback(() => {
    if (visible) {
      setVisible(false);
      return;
    }
    setActive(null);
  }, [visible]);

  React.useEffect(() => {
    if (active || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setActive(next);
    setVisible(true);
  }, [active, queue]);

  const value = useMemo(
    () => ({
      showSnackbar,
      hideSnackbar,
    }),
    [showSnackbar, hideSnackbar]
  );

  return (
    <SnackbarContext.Provider value={value}>
      <View style={styles.container}>
        {children}
        {active ? (
          <Snackbar
            visible={visible}
            type={active.type}
            message={active.message}
            duration={active.duration}
            actionLabel={active.actionLabel}
            onAction={() => {
              active.onAction?.();
              setVisible(false);
            }}
            onDismiss={handleDismiss}
          />
        ) : null}
      </View>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within SnackbarProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
