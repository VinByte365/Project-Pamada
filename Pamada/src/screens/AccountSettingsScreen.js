import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';
import { colors, radius, shadows, spacing, typography } from '../theme';

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

export default function AccountSettingsScreen({ navigation }) {
  const { token, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const languageRef = useRef(null);
  const locationRef = useRef(null);
  const farmSizeRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    language: 'en',
    location: '',
    farm_size: '',
  });
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('');
  const [pendingAvatarUri, setPendingAvatarUri] = useState('');

  const previewAvatarUri = pendingAvatarUri || currentAvatarUrl;
  const initials = useMemo(() => {
    const name = (form.full_name || '').trim();
    if (!name) return 'P';
    const parts = name.split(/\s+/).filter(Boolean);
    return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() || 'P';
  }, [form.full_name]);

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

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/v1/settings/account', {
        method: 'GET',
        token,
      });
      const account = response?.data?.account || {};
      setForm({
        full_name: account.full_name || '',
        email: account.email || '',
        phone: account.phone || '',
        language: account.language || 'en',
        location: account.location || '',
        farm_size: account.farm_size || '',
      });
      setCurrentAvatarUrl(account.profile_image_url || '');
      setPendingAvatarUri('');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load account settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setPendingAvatarUri(result.assets[0].uri);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest('/api/v1/settings/account', {
        method: 'PUT',
        token,
        body: JSON.stringify(form),
      });

      if (pendingAvatarUri) {
        setUploadingAvatar(true);
        const avatarForm = new FormData();
        avatarForm.append('avatar', {
          uri: pendingAvatarUri,
          name: `avatar-${Date.now()}.jpg`,
          type: 'image/jpeg',
        });

        const avatarResponse = await apiRequest('/api/v1/settings/account/avatar', {
          method: 'PUT',
          token,
          body: avatarForm,
        });
        setCurrentAvatarUrl(avatarResponse?.data?.profile_image_url || '');
        setPendingAvatarUri('');
      }

      await refreshUser();
      Alert.alert('Saved', 'Account settings updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update account settings');
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
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
            <Text style={styles.sectionTitle}>Profile Photo</Text>
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrap}>
                {previewAvatarUri ? (
                  <Image source={{ uri: previewAvatarUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>
              <View style={styles.avatarActions}>
                <TouchableOpacity onPress={pickAvatar} style={styles.avatarButton}>
                  <Ionicons name="image-outline" size={16} color={colors.primaryDark} />
                  <Text style={styles.avatarButtonText}>Choose Photo</Text>
                </TouchableOpacity>
                {pendingAvatarUri ? (
                  <Text style={styles.previewText}>Preview ready. Save changes to apply.</Text>
                ) : (
                  <Text style={styles.previewText}>No changes pending.</Text>
                )}
              </View>
            </View>

            <Input
              inputRef={fullNameRef}
              onFocus={() => ensureVisible(fullNameRef)}
              label="Full Name"
              value={form.full_name}
              onChangeText={(value) => updateField('full_name', value)}
              placeholder="Your full name"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              {...AUTOFILL_BLOCK_PROPS}
            />
            <Input
              inputRef={emailRef}
              onFocus={() => ensureVisible(emailRef)}
              label="Email"
              value={form.email}
              onChangeText={(value) => updateField('email', value)}
              placeholder="you@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              {...AUTOFILL_BLOCK_PROPS}
            />
            <Input
              inputRef={phoneRef}
              onFocus={() => ensureVisible(phoneRef)}
              label="Phone"
              value={form.phone}
              onChangeText={(value) => updateField('phone', value)}
              placeholder="09xx xxx xxxx"
              keyboardType="phone-pad"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              {...AUTOFILL_BLOCK_PROPS}
            />
            <Input
              inputRef={languageRef}
              onFocus={() => ensureVisible(languageRef)}
              label="Language"
              value={form.language}
              onChangeText={(value) => updateField('language', value)}
              placeholder="en"
              autoCapitalize="none"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              {...AUTOFILL_BLOCK_PROPS}
            />
            <Input
              inputRef={locationRef}
              onFocus={() => ensureVisible(locationRef)}
              label="Farm Location"
              value={form.location}
              onChangeText={(value) => updateField('location', value)}
              placeholder="City / Region"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              {...AUTOFILL_BLOCK_PROPS}
            />
            <Input
              inputRef={farmSizeRef}
              onFocus={() => ensureVisible(farmSizeRef)}
              label="Farm Size"
              value={form.farm_size}
              onChangeText={(value) => updateField('farm_size', value)}
              placeholder="e.g. 2 hectares"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              {...AUTOFILL_BLOCK_PROPS}
            />
          </View>

          <Button
            label={loading ? 'Loading...' : uploadingAvatar ? 'Uploading Photo...' : 'Save Changes'}
            onPress={save}
            loading={saving}
            disabled={loading}
            style={styles.saveButton}
          />
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
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    ...typography.titleLarge,
    color: colors.white,
  },
  avatarActions: {
    flex: 1,
  },
  avatarButton: {
    minHeight: 40,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  avatarButtonText: {
    ...typography.bodyBold,
    color: colors.primaryDark,
  },
  previewText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
});

