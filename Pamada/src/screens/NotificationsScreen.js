import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
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

export default function NotificationsScreen({ navigation }) {
  const { token } = useAuth();
  const [settings, setSettings] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/v1/settings/notifications', {
        method: 'GET',
        token,
      });
      setSettings({ ...defaultState, ...(response?.data?.notifications || {}) });
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest('/api/v1/settings/notifications', {
        method: 'PUT',
        token,
        body: JSON.stringify(settings),
      });
      Alert.alert('Saved', 'Notification settings updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { key: 'notification_enabled', label: 'Enable Notifications' },
    { key: 'push_notifications', label: 'Push Notifications' },
    { key: 'email_notifications', label: 'Email Notifications' },
    { key: 'disease_alert_notifications', label: 'Disease Alerts' },
    { key: 'scan_reminder_notifications', label: 'Scan Reminders' },
    { key: 'weekly_report_notifications', label: 'Weekly Reports' },
    { key: 'login_alerts', label: 'Login Security Alerts' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {rows.map((item, index) => (
            <View key={item.key} style={[styles.row, index === rows.length - 1 && styles.rowLast]}>
              <Text style={styles.label}>{item.label}</Text>
              <Switch
                value={Boolean(settings[item.key])}
                onValueChange={(value) => toggle(item.key, value)}
                trackColor={{ false: colors.border, true: '#9CD3AD' }}
                thumbColor={Boolean(settings[item.key]) ? colors.primary : '#F4F3F4'}
                disabled={loading}
              />
            </View>
          ))}
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
    paddingRight: spacing.sm,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
});
