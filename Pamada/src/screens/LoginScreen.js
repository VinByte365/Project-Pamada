import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';
import {
  Alert as InlineAlert,
  EnhancedButton,
  EnhancedInput,
} from '../components/common';
import ElevatedCard from '../components/ui/ElevatedCard';
import useAppTheme from '../theme/useAppTheme';
import { spacing, typography } from '../theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REMEMBER_EMAIL_KEY = '@aloe_remember_email';

const AUTOFILL_BLOCK_PROPS = Platform.select({
  android: {
    autoComplete: 'off',
    textContentType: 'none',
    importantForAutofill: 'no',
  },
  ios: {
    autoComplete: 'off',
    textContentType: 'none',
  },
  default: {
    autoComplete: 'off',
  },
});

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const { login } = useAuth();

  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotInfo, setForgotInfo] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState('request');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(REMEMBER_EMAIL_KEY).then((stored) => {
      if (mounted && stored) {
        setEmail(stored);
        setRememberMe(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event?.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isFormValid = useMemo(() => {
    return EMAIL_REGEX.test(email.trim()) && password.length >= 6;
  }, [email, password]);

  const ensureVisible = (inputRef) => {
    const field = inputRef?.current;
    const scroll = scrollRef.current;
    if (!field || !scroll || !keyboardHeight) return;

    requestAnimationFrame(() => {
      field.measureInWindow((x, y, width, height) => {
        const windowHeight = Dimensions.get('window').height;
        const keyboardTop = windowHeight - keyboardHeight;
        const fieldBottom = y + height;
        const safeGap = 18;

        if (fieldBottom > keyboardTop - safeGap) {
          const overlap = fieldBottom - (keyboardTop - safeGap);
          scroll.scrollTo({
            y: Math.max(0, scrollYRef.current + overlap + 20),
            animated: true,
          });
        }
      });
    });
  };

  const handleLogin = async () => {
    if (!isFormValid || loading) return;

    Keyboard.dismiss();
    setError('');
    setNotice('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      await login(normalizedEmail, password);
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, normalizedEmail);
      } else {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch (err) {
      setError(err.message || err.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotError('');
    setForgotInfo('');
    setForgotStep('request');
    setForgotEmail(email.trim().toLowerCase());
    setVerificationCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotVisible(true);
  };

  const sendResetCode = async () => {
    const normalizedEmail = forgotEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotInfo('');
    try {
      const response = await apiRequest('/api/v1/auth/forgotpassword', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail }),
      });
      setForgotStep('reset');
      setForgotInfo(response?.message || 'Verification code sent. Check your email.');
    } catch (err) {
      setForgotError(err.message || 'Failed to send verification code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const submitPasswordReset = async () => {
    const normalizedEmail = forgotEmail.trim().toLowerCase();
    const code = verificationCode.trim();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    if (!code) {
      setForgotError('Please enter the verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotInfo('');
    try {
      const response = await apiRequest('/api/v1/auth/resetpassword', {
        method: 'POST',
        body: JSON.stringify({
          email: normalizedEmail,
          code,
          newPassword,
        }),
      });

      setForgotVisible(false);
      setError('');
      setPassword('');
      setEmail(normalizedEmail);
      setForgotInfo('');
      setForgotError('');
      setForgotStep('request');
      setVerificationCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setNotice(response?.message || 'Password reset successful. Please sign in.');
    } catch (err) {
      setForgotError(err.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.lg) },
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={[styles.logoCircle, { backgroundColor: `${palette.primary.solid}1F` }]}>
              <Ionicons name="leaf" size={44} color={palette.primary.solid} />
            </View>
            <Text style={[styles.heroTitle, { color: palette.primary.end }]}>Pamada</Text>
            <Text style={[styles.heroSubtitle, { color: palette.text.secondary }]}>Sign in to your account</Text>
          </View>

          <ElevatedCard style={styles.formCard} floating>
            {error ? (
              <InlineAlert
                type="error"
                title="Sign in failed"
                message={error}
                dismissible
                onDismiss={() => setError('')}
                style={styles.errorBox}
              />
            ) : null}
            {notice ? (
              <InlineAlert
                type="success"
                title="Success"
                message={notice}
                dismissible
                onDismiss={() => setNotice('')}
                style={styles.errorBox}
              />
            ) : null}

            <View>
              <EnhancedInput
                inputRef={emailRef}
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                  if (notice) setNotice('');
                }}
                onFocus={() => ensureVisible(emailRef)}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                leftIcon="mail-outline"
                returnKeyType="done"
                blurOnSubmit
                disabled={loading}
                {...AUTOFILL_BLOCK_PROPS}
              />

              <EnhancedInput
                inputRef={passwordRef}
                label="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError('');
                  if (notice) setNotice('');
                }}
                onFocus={() => ensureVisible(passwordRef)}
                placeholder="********"
                secureTextEntry={!showPassword}
                onToggleSecure={() => setShowPassword((prev) => !prev)}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                leftIcon="lock-closed-outline"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                disabled={loading}
                {...AUTOFILL_BLOCK_PROPS}
              />
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setRememberMe((prev) => !prev)}
                disabled={loading}
                accessibilityLabel="Remember me"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: rememberMe ? palette.accent.action : palette.surface.borderStrong,
                      backgroundColor: rememberMe ? palette.accent.action : palette.surface.light,
                    },
                  ]}
                >
                  {rememberMe ? <Ionicons name="checkmark" size={13} color={palette.accent.on} /> : null}
                </View>
                <Text style={[styles.checkboxLabel, { color: palette.text.secondary }]}>Remember Me</Text>
              </TouchableOpacity>
            </View>

            <EnhancedButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={!isFormValid}
              style={styles.button}
              fullWidth
            />

            <View style={styles.switchContainer}>
              <Text style={[styles.switchText, { color: palette.text.secondary }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.replace('Register')} disabled={loading}>
                <Text style={[styles.switchLink, { color: palette.primary.solid }]}>Register</Text>
              </TouchableOpacity>
            </View>
          </ElevatedCard>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={forgotVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.surface.light, borderColor: palette.surface.border }]}>
            <Text style={[styles.modalTitle, { color: palette.text.primary }]}>Reset Password</Text>
            <Text style={[styles.modalSubtitle, { color: palette.text.secondary }]}>
              {forgotStep === 'request'
                ? 'Enter your registered email to receive a verification code.'
                : 'Enter the code from your email and set your new password.'}
            </Text>

            {forgotError ? (
              <InlineAlert type="error" title="Reset failed" message={forgotError} dismissible onDismiss={() => setForgotError('')} />
            ) : null}
            {forgotInfo ? (
              <InlineAlert type="success" title="Success" message={forgotInfo} dismissible onDismiss={() => setForgotInfo('')} />
            ) : null}

            <EnhancedInput
              label="Email"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="mail-outline"
              disabled={forgotLoading}
              {...AUTOFILL_BLOCK_PROPS}
            />

            {forgotStep === 'reset' ? (
              <>
                <EnhancedInput
                  label="Verification Code"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="6-digit code"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon="key-outline"
                  disabled={forgotLoading}
                  {...AUTOFILL_BLOCK_PROPS}
                />

                <EnhancedInput
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="********"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon="lock-closed-outline"
                  disabled={forgotLoading}
                  {...AUTOFILL_BLOCK_PROPS}
                />

                <EnhancedInput
                  label="Confirm New Password"
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  placeholder="********"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon="shield-checkmark-outline"
                  disabled={forgotLoading}
                  {...AUTOFILL_BLOCK_PROPS}
                />
              </>
            ) : null}

            <View style={styles.modalActions}>
              <EnhancedButton
                type="secondary"
                label="Cancel"
                onPress={() => setForgotVisible(false)}
                disabled={forgotLoading}
                style={styles.modalBtn}
              />
              {forgotStep === 'request' ? (
                <EnhancedButton
                  label="Send Code"
                  onPress={sendResetCode}
                  loading={forgotLoading}
                  style={styles.modalBtn}
                />
              ) : (
                <EnhancedButton
                  label="Reset Password"
                  onPress={submitPasswordReset}
                  loading={forgotLoading}
                  style={styles.modalBtn}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  logoCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.headline,
    fontSize: 42,
  },
  heroSubtitle: {
    ...typography.subheadBold,
    marginTop: spacing.xs,
  },
  formCard: {
    padding: spacing.lg,
    borderRadius: 28,
  },
  errorBox: {
    marginBottom: spacing.md,
  },
  row: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  checkboxRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  checkboxLabel: {
    ...typography.subhead,
  },
  forgotLink: {
    ...typography.subheadBold,
  },
  button: {
    borderRadius: 14,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  switchText: {
    ...typography.body,
  },
  switchLink: {
    ...typography.bodyBold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
  },
  modalCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.md,
  },
  modalTitle: {
    ...typography.title,
  },
  modalSubtitle: {
    ...typography.caption,
    marginTop: spacing.xxs,
    marginBottom: spacing.sm,
  },
  modalActions: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
});
