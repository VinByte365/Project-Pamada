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
import Button from '../components/common/Button';
import ElevatedCard from '../components/ui/ElevatedCard';
import AuthTextField from '../components/auth/AuthTextField';
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
            <View style={styles.logoCircle}>
              <Ionicons name="leaf" size={44} color="#2E9B57" />
            </View>
            <Text style={styles.heroTitle}>Pamada</Text>
            <Text style={styles.heroSubtitle}>Create your account</Text>
          </View>

          <ElevatedCard style={styles.formCard} floating>
            {error ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: `${palette.status.danger}14`,
                    borderColor: `${palette.status.danger}40`,
                  },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={18} color={palette.status.danger} />
                <Text style={[styles.errorText, { color: palette.status.danger }]}>{error}</Text>
              </View>
            ) : null}

            <View>
              <AuthTextField
                ref={fullNameRef}
                label="Full Name"
                icon=""
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (error) setError('');
                }}
                onFocus={() => ensureVisible(fullNameRef)}
                placeholder="John Doe"
                autoCapitalize="words"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="done"
                blurOnSubmit
                editable={!loading}
                {...AUTOFILL_BLOCK_PROPS}
              />

              <AuthTextField
                ref={emailRef}
                label="Email"
                icon=""
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
                onFocus={() => ensureVisible(emailRef)}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="done"
                blurOnSubmit
                editable={!loading}
                {...AUTOFILL_BLOCK_PROPS}
              />

              <AuthTextField
                ref={passwordRef}
                label="Password"
                icon=""
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError('');
                }}
                onFocus={() => ensureVisible(passwordRef)}
                placeholder="********"
                secureTextEntry={!showPassword}
                onToggleSecure={() => setShowPassword((prev) => !prev)}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="done"
                blurOnSubmit
                editable={!loading}
                {...AUTOFILL_BLOCK_PROPS}
              />

              <AuthTextField
                ref={confirmPasswordRef}
                label="Confirm Password"
                icon=""
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (error) setError('');
                }}
                onFocus={() => ensureVisible(confirmPasswordRef)}
                placeholder="********"
                secureTextEntry={!showConfirmPassword}
                onToggleSecure={() => setShowConfirmPassword((prev) => !prev)}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="done"
                blurOnSubmit
                editable={!loading}
                {...AUTOFILL_BLOCK_PROPS}
              />

              <AuthTextField
                ref={phoneRef}
                label="Phone (optional)"
                icon=""
                value={phone}
                onChangeText={setPhone}
                onFocus={() => ensureVisible(phoneRef)}
                placeholder="+1 234 567 8900"
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                editable={!loading}
                {...AUTOFILL_BLOCK_PROPS}
              />
            </View>

            {validationError ? <Text style={styles.hint}>{validationError}</Text> : null}

            <Button label="Create Account" onPress={handleRegister} loading={loading} disabled={!isFormValid} style={styles.button} />

            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.replace('Login')} disabled={loading}>
                <Text style={styles.switchLink}>Sign In</Text>
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
    backgroundColor: '#F3F4F4',
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
    backgroundColor: '#DFF5E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.headline,
    fontSize: 42,
    color: '#216E40',
  },
  heroSubtitle: {
    ...typography.subheadBold,
    color: '#5F5F5F',
    marginTop: spacing.xs,
  },
  formCard: {
    padding: spacing.lg,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderColor: '#ECECEC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.body,
    flex: 1,
  },
  hint: {
    ...typography.caption,
    color: '#D0891D',
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
    color: '#5F5F5F',
  },
  switchLink: {
    ...typography.bodyBold,
    color: '#2E9B57',
  },
});
