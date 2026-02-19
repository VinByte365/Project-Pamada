import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';
import { colors, spacing, radius, typography, shadows } from '../theme';

const defaultPrivacy = {
  data_sharing_consent: false,
  profile_visibility: 'private',
  two_factor_enabled: false,
};

export default function PrivacySecurityScreen({ navigation }) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const currentPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);

  const [privacy, setPrivacy] = useState(defaultPrivacy);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event?.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const ensureVisible = (inputRef) => {
    const field = inputRef?.current;
    const scroll = scrollRef.current;
    if (!field || !scroll || !keyboardHeight) return;

    requestAnimationFrame(() => {
      field.measureInWindow((x, y, width, height) => {
        const keyboardTop = Dimensions.get('window').height - keyboardHeight;
        const fieldBottom = y + height;
        const safeGap = 18;

        if (fieldBottom > keyboardTop - safeGap) {
          const overlap = fieldBottom - (keyboardTop - safeGap);
          scroll.scrollTo({ y: Math.max(0, scrollYRef.current + overlap + 20), animated: true });
        }
      });
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/v1/settings/privacy', {
        method: 'GET',
        token,
      });
      setPrivacy({ ...defaultPrivacy, ...(response?.data?.privacy || {}) });
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load privacy settings');
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
      Alert.alert('Saved', 'Privacy and security settings updated');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update privacy settings');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const changePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      Alert.alert('Validation', 'Please provide current and new password');
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
      Alert.alert('Saved', 'Password updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
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
          ref={scrollRef}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Data Sharing Consent</Text>
              <Switch
                value={privacy.data_sharing_consent}
                onValueChange={(value) => setPrivacy((prev) => ({ ...prev, data_sharing_consent: value }))}
                disabled={loading}
                trackColor={{ false: colors.border, true: '#9CD3AD' }}
                thumbColor={privacy.data_sharing_consent ? colors.primary : '#F4F3F4'}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Two-Factor Auth (placeholder)</Text>
              <Switch
                value={privacy.two_factor_enabled}
                onValueChange={(value) => setPrivacy((prev) => ({ ...prev, two_factor_enabled: value }))}
                disabled={loading}
                trackColor={{ false: colors.border, true: '#9CD3AD' }}
                thumbColor={privacy.two_factor_enabled ? colors.primary : '#F4F3F4'}
              />
            </View>

            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.label}>Team Visibility</Text>
              <Switch
                value={privacy.profile_visibility === 'team'}
                onValueChange={(value) => setPrivacy((prev) => ({ ...prev, profile_visibility: value ? 'team' : 'private' }))}
                disabled={loading}
                trackColor={{ false: colors.border, true: '#9CD3AD' }}
                thumbColor={privacy.profile_visibility === 'team' ? colors.primary : '#F4F3F4'}
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
            <Input
              inputRef={currentPasswordRef}
              onFocus={() => ensureVisible(currentPasswordRef)}
              label="Current Password"
              value={passwordForm.currentPassword}
              onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
              placeholder="Current password"
              secureTextEntry
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => newPasswordRef.current?.focus()}
            />
            <Input
              inputRef={newPasswordRef}
              onFocus={() => ensureVisible(newPasswordRef)}
              label="New Password"
              value={passwordForm.newPassword}
              onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
              placeholder="New password"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={changePassword}
            />
            <Button
              label="Update Password"
              onPress={changePassword}
              loading={savingPassword}
              type="secondary"
            />
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
  passwordCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
});
