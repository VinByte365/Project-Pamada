import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { apiRequest } from '../utils/api';
import { colors, spacing, radius, typography, shadows } from '../theme';

const defaultState = {
  notification_enabled: true,
  push_notifications: true,
  email_notifications: true,
  disease_alert_notifications: true,
  scan_reminder_notifications: true,
  weekly_report_notifications: false,
  login_alerts: true,
};

const applyNotificationDependencies = (next) => {
  const state = { ...next };

  if (!state.notification_enabled) {
    return {
      ...state,
      push_notifications: false,
      email_notifications: false,
      disease_alert_notifications: false,
      scan_reminder_notifications: false,
      weekly_report_notifications: false,
      login_alerts: false,
    };
  }

  if (!state.push_notifications) {
    state.disease_alert_notifications = false;
    state.scan_reminder_notifications = false;
  }

  if (!state.email_notifications) {
    state.weekly_report_notifications = false;
  }

  return state;
};

export default function NotificationsScreen({ navigation }) {
  const { token } = useAuth();
  const { showSnackbar } = useSnackbar();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const [settings, setSettings] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/v1/settings/notifications', {
        method: 'GET',
        token,
      });
      setSettings(applyNotificationDependencies({ ...defaultState, ...(response?.data?.notifications || {}) }));
    } catch (error) {
      showSnackbar({ type: 'error', message: error.message || 'Failed to load notification settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = (key, value) => {
    setSettings((prev) => {
      let next = { ...prev, [key]: value };
      if (value && key !== 'notification_enabled') {
        next.notification_enabled = true;
      }
      if (value && (key === 'disease_alert_notifications' || key === 'scan_reminder_notifications')) {
        next.push_notifications = true;
      }
      if (value && key === 'weekly_report_notifications') {
        next.email_notifications = true;
      }
      return applyNotificationDependencies(next);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest('/api/v1/settings/notifications', {
        method: 'PUT',
        token,
        body: JSON.stringify(settings),
      });
      showSnackbar({ type: 'success', message: 'Notification settings updated successfully' });
    } catch (error) {
      showSnackbar({ type: 'error', message: error.message || 'Failed to update notification settings' });
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const rows = [
    {
      key: 'notification_enabled',
      label: 'Enable Notifications',
      description: 'Master control for all alerts.',
      icon: 'notifications-outline',
      section: 'General',
    },
    {
      key: 'push_notifications',
      label: 'Push Notifications',
      description: 'Instant alerts on your phone.',
      icon: 'phone-portrait-outline',
      dependsOn: ['notification_enabled'],
      section: 'Channels',
    },
    {
      key: 'email_notifications',
      label: 'Email Notifications',
      description: 'Delivery via your account email.',
      icon: 'mail-outline',
      dependsOn: ['notification_enabled'],
      section: 'Channels',
    },
    {
      key: 'disease_alert_notifications',
      label: 'Disease Alerts',
      description: 'Warnings when disease is detected.',
      icon: 'warning-outline',
      dependsOn: ['notification_enabled', 'push_notifications'],
      section: 'Alerts',
    },
    {
      key: 'scan_reminder_notifications',
      label: 'Scan Reminders',
      description: 'Reminders for regular plant scans.',
      icon: 'scan-outline',
      dependsOn: ['notification_enabled', 'push_notifications'],
      section: 'Alerts',
    },
    {
      key: 'weekly_report_notifications',
      label: 'Weekly Reports',
      description: 'Summary insights every week.',
      icon: 'bar-chart-outline',
      dependsOn: ['notification_enabled', 'email_notifications'],
      section: 'Alerts',
    },
    {
      key: 'login_alerts',
      label: 'Login Security Alerts',
      description: 'Notifies you when a login is detected.',
      icon: 'shield-checkmark-outline',
      dependsOn: ['notification_enabled'],
      section: 'Security',
    },
  ];

  const sections = ['General', 'Channels', 'Alerts', 'Security'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.pageLead}>
          <Text style={styles.pageTitle}>Notification Preferences</Text>
          <Text style={styles.pageSubtitle}>Control where alerts are delivered and which updates you receive.</Text>
        </View>

        {sections.map((section) => (
          <View key={section} style={styles.card}>
            <Text style={styles.sectionTitle}>{section}</Text>
            {rows
              .filter((item) => item.section === section)
              .map((item, index, list) => {
                const disabled = item.dependsOn?.some((dep) => !settings[dep]);
                return (
                  <View
                    key={item.key}
                    style={[
                      styles.row,
                      index === list.length - 1 && styles.rowLast,
                      disabled && styles.rowDisabled,
                    ]}
                  >
                    <View style={styles.rowLeft}>
                      <View style={styles.rowIconWrap}>
                        <Ionicons name={item.icon} size={isCompact ? 15 : 16} color={colors.primaryDark} />
                      </View>
                      <View style={styles.rowTextWrap}>
                        <Text style={[styles.label, disabled && styles.labelDisabled]}>{item.label}</Text>
                        <Text style={[styles.rowDescription, disabled && styles.labelDisabled]}>{item.description}</Text>
                      </View>
                    </View>
                    <Switch
                      value={Boolean(settings[item.key])}
                      onValueChange={(value) => toggle(item.key, value)}
                      trackColor={{ false: colors.border, true: '#9CD3AD' }}
                      thumbColor={Boolean(settings[item.key]) ? colors.primary : '#F4F3F4'}
                      disabled={loading || disabled}
                    />
                  </View>
                );
              })}
          </View>
        ))}

        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.tipText}>
            Disabling the main notification switch will turn off all channels and alert types.
          </Text>
        </View>

        <Button
          label="Save Notifications"
          onPress={save}
          loading={saving}
          disabled={loading}
          style={styles.saveButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.title,
    color: colors.text.primary,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  pageLead: {
    marginBottom: spacing.md,
  },
  pageTitle: {
    ...typography.bodyBold,
    fontSize: 20,
    color: colors.text.primary,
  },
  pageSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: 1,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowDisabled: {
    opacity: 0.56,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  rowDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  labelDisabled: {
    color: colors.text.secondary,
  },
  tipCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  tipText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
});
