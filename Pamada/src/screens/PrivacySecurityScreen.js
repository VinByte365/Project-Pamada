import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { apiRequest } from '../utils/api';
import { colors, spacing, radius, typography, shadows } from '../theme';

const defaultPrivacy = {
  data_sharing_consent: false,
  two_factor_enabled: false,
};

const AUTOFILL_BLOCK_PROPS = Platform.select({
  android: {
    autoComplete: 'off',
    textContentType: 'none',
    importantForAutofill: 'noExcludeDescendants',
  },
  ios: {
    autoComplete: 'off',
    textContentType: 'none',
  },
  default: {
    autoComplete: 'off',
  },
});

export default function PrivacySecurityScreen({ navigation }) {
  const { token } = useAuth();
  const { showSnackbar } = useSnackbar();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;

  const currentPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);

  const [privacy, setPrivacy] = useState(defaultPrivacy);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/v1/settings/privacy', {
        method: 'GET',
        token,
      });
      setPrivacy({ ...defaultPrivacy, ...(response?.data?.privacy || {}) });
    } catch (error) {
      showSnackbar({ type: 'error', message: error.message || 'Failed to load privacy settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const savePrivacy = async () => {
    setSavingPrivacy(true);
    try {
      await apiRequest('/api/v1/settings/privacy', {
        method: 'PUT',
        token,
        body: JSON.stringify(privacy),
      });
      showSnackbar({ type: 'success', message: 'Privacy and security settings updated' });
    } catch (error) {
      showSnackbar({ type: 'error', message: error.message || 'Failed to update privacy settings' });
    } finally {
      setSavingPrivacy(false);
    }
  };

  const changePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showSnackbar({ type: 'warning', message: 'Please provide current and new password' });
      return;
    }

    setSavingPassword(true);
    try {
      await apiRequest('/api/v1/auth/updatepassword', {
        method: 'PUT',
        token,
        body: JSON.stringify(passwordForm),
      });
      setPasswordForm({ currentPassword: '', newPassword: '' });
      Keyboard.dismiss();
      showSnackbar({ type: 'success', message: 'Password updated successfully' });
    } catch (error) {
      showSnackbar({ type: 'error', message: error.message || 'Failed to update password' });
    } finally {
      setSavingPassword(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageLead}>
            <Text style={styles.pageTitle}>Privacy & Security</Text>
            <Text style={styles.pageSubtitle}>Manage data sharing, account protection, and password credentials.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Privacy Controls</Text>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconWrap}>
                  <Ionicons name="share-social-outline" size={isCompact ? 15 : 16} color={colors.primaryDark} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.label}>Data Sharing Consent</Text>
                  <Text style={styles.rowDescription}>Allow anonymized app improvement data sharing.</Text>
                </View>
              </View>
              <Switch
                value={privacy.data_sharing_consent}
                onValueChange={(value) => setPrivacy((prev) => ({ ...prev, data_sharing_consent: value }))}
                disabled={loading}
                trackColor={{ false: colors.border, true: '#9CD3AD' }}
                thumbColor={privacy.data_sharing_consent ? colors.primary : '#F4F3F4'}
              />
            </View>

            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={isCompact ? 15 : 16} color={colors.primaryDark} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.label}>Two-Factor Authentication</Text>
                  <Text style={styles.rowDescription}>Adds an extra verification layer to sign-in.</Text>
                </View>
              </View>
              <Switch
                value={privacy.two_factor_enabled}
                onValueChange={(value) => setPrivacy((prev) => ({ ...prev, two_factor_enabled: value }))}
                disabled={loading}
                trackColor={{ false: colors.border, true: '#9CD3AD' }}
                thumbColor={privacy.two_factor_enabled ? colors.primary : '#F4F3F4'}
              />
            </View>
          </View>

          <Button
            label="Save Privacy Settings"
            onPress={savePrivacy}
            loading={savingPrivacy}
            disabled={loading}
            style={styles.saveButton}
          />

          <View style={[styles.card, styles.passwordCard]}>
            <Text style={styles.cardTitle}>Change Password</Text>
            <Text style={styles.passwordNote}>Use a strong password with at least 8 characters.</Text>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Current Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  ref={currentPasswordRef}
                  value={passwordForm.currentPassword}
                  onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
                  placeholder="Current password"
                  placeholderTextColor={colors.text.secondary}
                  style={styles.fieldInput}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => newPasswordRef.current?.focus?.()}
                  {...AUTOFILL_BLOCK_PROPS}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowCurrentPassword((prev) => !prev)}
                >
                  <Ionicons
                    name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>New Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  ref={newPasswordRef}
                  value={passwordForm.newPassword}
                  onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
                  placeholder="New password"
                  placeholderTextColor={colors.text.secondary}
                  style={styles.fieldInput}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  returnKeyType="done"
                  onSubmitEditing={changePassword}
                  {...AUTOFILL_BLOCK_PROPS}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowNewPassword((prev) => !prev)}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <Button
              label="Update Password"
              onPress={changePassword}
              loading={savingPassword}
              type="secondary"
            />
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.tipText}>
              For account safety, avoid reusing passwords from other apps and rotate passwords regularly.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
  rowLast: {
    borderBottomWidth: 0,
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
  label: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  rowDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
  passwordCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  passwordNote: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  fieldWrap: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  fieldInput: {
    minHeight: 50,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingRight: 44,
    ...typography.body,
    color: colors.text.primary,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.sm,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
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
    marginTop: spacing.md,
  },
  tipText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
});
