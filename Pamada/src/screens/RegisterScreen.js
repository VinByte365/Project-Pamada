import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import {
  Alert as InlineAlert,
  EnhancedButton,
  EnhancedInput,
} from '../components/common';
import ElevatedCard from '../components/ui/ElevatedCard';
import useAppTheme from '../theme/useAppTheme';
import { spacing, typography } from '../theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

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

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const { register } = useAuth();

  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const phoneRef = useRef(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const validationError = useMemo(() => {
    if (fullName.trim().length < 2) return 'Full name must be at least 2 characters.';
    if (!EMAIL_REGEX.test(email.trim())) return 'Enter a valid email address.';
    if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  }, [confirmPassword, email, fullName, password]);

  const isFormValid = validationError.length === 0;

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

  const handleRegister = async () => {
    if (!isFormValid || loading) return;

    Keyboard.dismiss();
    setError('');
    setLoading(true);

    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });
    } catch (err) {
      setError(err.message || err.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
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
            <Text style={[styles.heroSubtitle, { color: palette.text.secondary }]}>Create your account</Text>
          </View>

          <ElevatedCard style={styles.formCard} floating>
            {error ? (
              <InlineAlert
                type="error"
                title="Registration failed"
                message={error}
                dismissible
                onDismiss={() => setError('')}
                style={styles.errorBox}
              />
            ) : null}

            <View>
              <EnhancedInput
                inputRef={fullNameRef}
                label="Full Name"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (error) setError('');
                }}
                onFocus={() => ensureVisible(fullNameRef)}
                placeholder="John Doe"
                leftIcon="person-outline"
                autoCapitalize="words"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="done"
                blurOnSubmit
                disabled={loading}
                {...AUTOFILL_BLOCK_PROPS}
              />

              <EnhancedInput
                inputRef={emailRef}
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
                onFocus={() => ensureVisible(emailRef)}
                placeholder="you@example.com"
                keyboardType="email-address"
                leftIcon="mail-outline"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
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
                }}
                onFocus={() => ensureVisible(passwordRef)}
                placeholder="********"
                secureTextEntry={!showPassword}
                onToggleSecure={() => setShowPassword((prev) => !prev)}
                leftIcon="lock-closed-outline"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="done"
                blurOnSubmit
                disabled={loading}
                {...AUTOFILL_BLOCK_PROPS}
              />

              <EnhancedInput
                inputRef={confirmPasswordRef}
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (error) setError('');
                }}
                onFocus={() => ensureVisible(confirmPasswordRef)}
                placeholder="********"
                secureTextEntry={!showConfirmPassword}
                onToggleSecure={() => setShowConfirmPassword((prev) => !prev)}
                leftIcon="shield-checkmark-outline"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="done"
                blurOnSubmit
                disabled={loading}
                {...AUTOFILL_BLOCK_PROPS}
              />

              <EnhancedInput
                inputRef={phoneRef}
                label="Phone (optional)"
                value={phone}
                onChangeText={setPhone}
                onFocus={() => ensureVisible(phoneRef)}
                placeholder="+1 234 567 8900"
                keyboardType="phone-pad"
                leftIcon="call-outline"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                disabled={loading}
                {...AUTOFILL_BLOCK_PROPS}
              />
            </View>

            {validationError ? <Text style={[styles.hint, { color: palette.status.warning }]}>{validationError}</Text> : null}

            <EnhancedButton
              label="Create Account"
              onPress={handleRegister}
              loading={loading}
              disabled={!isFormValid}
              style={styles.button}
              fullWidth
            />

            <View style={styles.switchContainer}>
              <Text style={[styles.switchText, { color: palette.text.secondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.replace('Login')} disabled={loading}>
                <Text style={[styles.switchLink, { color: palette.primary.solid }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ElevatedCard>
        </ScrollView>
      </KeyboardAvoidingView>
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
  hint: {
    ...typography.caption,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
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
});
