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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';
import ElevatedCard from '../components/ui/ElevatedCard';
import AuthTextField from '../components/auth/AuthTextField';
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
            <Text style={styles.heroSubtitle}>Sign in to your account</Text>
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
                onSubmitEditing={Keyboard.dismiss}
                editable={!loading}
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
                      borderColor: rememberMe ? '#7CC191' : '#A7A7A7',
                      backgroundColor: rememberMe ? '#7CC191' : '#FFFFFF',
                    },
                  ]}
                >
                  {rememberMe ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
                </View>
                <Text style={styles.checkboxLabel}>Remember Me</Text>
              </TouchableOpacity>

              <TouchableOpacity disabled={loading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.forgotLink}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <Button label="Sign In" onPress={handleLogin} loading={loading} disabled={!isFormValid} style={styles.button} />

            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.replace('Register')} disabled={loading}>
                <Text style={styles.switchLink}>Register</Text>
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
    color: '#666666',
  },
  forgotLink: {
    ...typography.subheadBold,
    color: '#2E9B57',
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
