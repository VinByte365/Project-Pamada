import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import AnimatedInView from '../components/common/AnimatedInView';
import { colors, spacing, radius, typography, shadows } from '../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const farmInfo = {
    name: user?.full_name || 'Green Valley Aloe Farm',
    location: 'Taguig City, Philippines',
    size: '2.5 hectares',
    plants: 164,
    joined: '2023-05-15',
  };

  const settings = [
    { icon: 'person-circle', label: 'Account Settings', color: colors.primary, bgColor: '#ECFDF5' },
    { icon: 'notifications', label: 'Notifications', color: '#2563EB', bgColor: '#E0F2FE' },
    { icon: 'shield-checkmark', label: 'Privacy & Security', color: '#F59E0B', bgColor: '#FEF3C7' },
    { icon: 'help-circle', label: 'Help & Support', color: '#7C3AED', bgColor: '#EDE9FE' },
    { icon: 'information-circle', label: 'About Pamada', color: '#64748B', bgColor: '#E2E8F0' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <AnimatedInView>
            <View style={styles.profileHeader}>
              <View style={styles.profileIcon}>
                <Ionicons name="leaf" size={56} color={colors.primary} />
              </View>
              <Text style={styles.profileName}>{farmInfo.name}</Text>
              <Text style={styles.profileLocation}>{farmInfo.location}</Text>
            </View>
          </AnimatedInView>

          <AnimatedInView delay={80}>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewTitle}>Farm Overview</Text>

              <View style={styles.overviewItem}>
                <View style={styles.overviewItemLeft}>
                  <Ionicons name="location" size={18} color={colors.textMuted} />
                  <Text style={styles.overviewLabel}>Farm Size</Text>
                </View>
                <Text style={styles.overviewValue}>{farmInfo.size}</Text>
              </View>

              <View style={styles.overviewItem}>
                <View style={styles.overviewItemLeft}>
                  <Ionicons name="leaf" size={18} color={colors.textMuted} />
                  <Text style={styles.overviewLabel}>Total Plants</Text>
                </View>
                <Text style={styles.overviewValue}>{farmInfo.plants}</Text>
              </View>

              <View style={styles.overviewItem}>
                <View style={styles.overviewItemLeft}>
                  <Ionicons name="calendar" size={18} color={colors.textMuted} />
                  <Text style={styles.overviewLabel}>Joined Pamada</Text>
                </View>
                <Text style={styles.overviewValue}>{farmInfo.joined}</Text>
              </View>

              <View style={[styles.overviewItem, styles.overviewItemLast]}>
                <View style={styles.overviewItemLeft}>
                  <Ionicons name="stats-chart" size={18} color={colors.textMuted} />
                  <Text style={styles.overviewLabel}>AI Confidence</Text>
                </View>
                <Text style={[styles.overviewValue, styles.overviewValueAccuracy]}>94.2%</Text>
              </View>
            </View>
          </AnimatedInView>

          <AnimatedInView delay={140}>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsHeader}>Settings</Text>

              {settings.map((setting, index) => (
                <TouchableOpacity
                  key={setting.label}
                  style={[styles.settingItem, index === 0 && styles.settingItemFirst]}
                >
                  <View style={[styles.settingIcon, { backgroundColor: setting.bgColor }]}
                  >
                    <Ionicons name={setting.icon} size={20} color={setting.color} />
                  </View>
                  <Text style={styles.settingLabel}>{setting.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textHint} />
                </TouchableOpacity>
              ))}
            </View>
          </AnimatedInView>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>Pamada v1.0 - YOLOv8 AI Model</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  profileName: {
    ...typography.titleLarge,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xxs,
  },
  profileLocation: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  overviewTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  overviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  overviewItemLast: {
    borderBottomWidth: 0,
  },
  overviewItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  overviewLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  overviewValue: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },
  overviewValueAccuracy: {
    color: colors.successDark,
  },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  settingsHeader: {
    ...typography.bodyBold,
    color: colors.text.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  settingItemFirst: {
    borderTopWidth: 0,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  logoutText: {
    ...typography.bodyBold,
    color: colors.error,
    marginLeft: spacing.xs,
  },
  footerText: {
    textAlign: 'center',
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
});