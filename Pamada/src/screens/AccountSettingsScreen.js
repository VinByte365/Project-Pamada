import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
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

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'fil', label: 'Filipino' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
];

const FARM_SIZE_UNITS = ['sqm', 'hectare', 'acre', 'sq ft'];

const parseFarmSize = (rawValue = '') => {
  const value = String(rawValue).trim();
  if (!value) return { sizeValue: '', unit: 'sqm' };
  const matched = value.match(/^([\d.,]+)\s*(.*)$/);
  const sizeValue = matched?.[1] || value;
  const unitRaw = (matched?.[2] || '').trim().toLowerCase();
  const unit = FARM_SIZE_UNITS.find((item) => item === unitRaw) || 'sqm';
  return { sizeValue, unit };
};

export default function AccountSettingsScreen({ navigation }) {
  const { token, refreshUser } = useAuth();
  const { showSnackbar } = useSnackbar();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    language: 'en',
    location: '',
    farm_size: '',
  });
  const [farmSizeValue, setFarmSizeValue] = useState('');
  const [farmSizeUnit, setFarmSizeUnit] = useState('sqm');
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('');
  const [pendingAvatarUri, setPendingAvatarUri] = useState('');
  const [currentCoverUrl, setCurrentCoverUrl] = useState('');
  const [pendingCoverUri, setPendingCoverUri] = useState('');
  const fieldRefs = useRef({});

  const previewAvatarUri = pendingAvatarUri || currentAvatarUrl;
  const previewCoverUri = pendingCoverUri || currentCoverUrl;
  const initials = useMemo(() => {
    const name = (form.full_name || '').trim();
    if (!name) return 'P';
    const parts = name.split(/\s+/).filter(Boolean);
    return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() || 'P';
  }, [form.full_name]);

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
      const parsedFarm = parseFarmSize(account.farm_size || '');
      setFarmSizeValue(parsedFarm.sizeValue);
      setFarmSizeUnit(parsedFarm.unit);
      setCurrentAvatarUrl(account.profile_image_url || '');
      setCurrentCoverUrl(account.cover_image_url || '');
      setPendingAvatarUri('');
      setPendingCoverUri('');
    } catch (error) {
      showSnackbar({ type: 'error', message: error.message || 'Failed to load account settings' });
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showSnackbar({ type: 'warning', message: 'Please allow photo access to set a profile picture.' });
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

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showSnackbar({ type: 'warning', message: 'Please allow photo access to set a cover photo.' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setPendingCoverUri(result.assets[0].uri);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        farm_size: farmSizeValue.trim()
          ? `${farmSizeValue.trim()} ${farmSizeUnit}`
          : '',
      };

      await apiRequest('/api/v1/settings/account', {
        method: 'PUT',
        token,
        body: JSON.stringify(payload),
      });

      if (pendingCoverUri) {
        setUploadingCover(true);
        const coverForm = new FormData();
        coverForm.append('cover', {
          uri: pendingCoverUri,
          name: `cover-${Date.now()}.jpg`,
          type: 'image/jpeg',
        });

        const coverResponse = await apiRequest('/api/v1/settings/account/cover', {
          method: 'PUT',
          token,
          body: coverForm,
        });
        setCurrentCoverUrl(coverResponse?.data?.cover_image_url || '');
        setPendingCoverUri('');
      }

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
      showSnackbar({ type: 'success', message: 'Account settings updated successfully' });
    } catch (error) {
      showSnackbar({ type: 'error', message: error.message || 'Failed to update account settings' });
    } finally {
      setSaving(false);
      setUploadingCover(false);
      setUploadingAvatar(false);
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        showSnackbar({ type: 'warning', message: 'Enable location permission to use exact location.' });
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const latitude = position?.coords?.latitude;
      const longitude = position?.coords?.longitude;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new Error('Location coordinates unavailable.');
      }

      const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
      const top = reverse?.[0];
      const locationText = [top?.city, top?.region, top?.country].filter(Boolean).join(', ');
      updateField('location', locationText || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } catch (error) {
      showSnackbar({ type: 'error', message: error.message || 'Failed to get your current location.' });
    } finally {
      setLocating(false);
    }
  };

  const renderField = ({
    key,
    label,
    placeholder,
    keyboardType = 'default',
    autoCapitalize = 'none',
    returnKeyType = 'next',
    nextKey = null,
  }) => (
    <View style={styles.fieldWrap} key={key}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        ref={(ref) => {
          fieldRefs.current[key] = ref;
        }}
        value={form[key]}
        onChangeText={(value) => updateField(key, value)}
        placeholder={placeholder}
        placeholderTextColor={colors.text.secondary}
        style={styles.fieldInput}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        spellCheck={false}
        returnKeyType={returnKeyType}
        blurOnSubmit={!nextKey}
        onSubmitEditing={() => {
          if (!nextKey) {
            Keyboard.dismiss();
            return;
          }
          fieldRefs.current[nextKey]?.focus?.();
        }}
        {...AUTOFILL_BLOCK_PROPS}
      />
    </View>
  );

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
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageLead}>
            <Text style={styles.pageTitle}>Account Settings</Text>
            <Text style={styles.pageSubtitle}>Manage your profile identity, photos, and farm details.</Text>
            <TouchableOpacity
              style={styles.reportIssueQuickLink}
              onPress={() => navigation.navigate('ReportIssue')}
              accessibilityRole="button"
              accessibilityLabel="Report an issue"
            >
              <Ionicons name="flag-outline" size={15} color={colors.primaryDark} />
              <Text style={styles.reportIssueQuickText}>Report an issue</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cover Photo</Text>
              <Text style={styles.sectionHint}>Shown at the top of your profile.</Text>
            </View>
            <View style={styles.coverWrap}>
              {previewCoverUri ? (
                <Image source={{ uri: previewCoverUri }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverFallback}>
                  <Ionicons name="image-outline" size={22} color={colors.primaryDark} />
                  <Text style={styles.coverFallbackText}>No cover photo yet</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={pickCover} style={styles.coverButton}>
              <Ionicons name="images-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.coverButtonText}>Choose Cover Photo</Text>
            </TouchableOpacity>
            <Text style={styles.previewText}>
              {pendingCoverUri ? 'Cover preview ready. Save changes to apply.' : 'No cover changes pending.'}
            </Text>

            <View style={styles.sectionDivider} />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Profile Photo</Text>
              <Text style={styles.sectionHint}>Used for messages and community posts.</Text>
            </View>
            <View style={[styles.avatarRow, isCompact && styles.avatarRowCompact]}>
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

            <View style={styles.sectionDivider} />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Text style={styles.sectionHint}>Keep your profile and contact info current.</Text>
            </View>
            {renderField({
              key: 'full_name',
              label: 'Full Name',
              placeholder: 'Enter your name',
              autoCapitalize: 'words',
              nextKey: 'email',
            })}
            {renderField({
              key: 'email',
              label: 'Email',
              placeholder: 'you@example.com',
              keyboardType: 'email-address',
              nextKey: 'phone',
            })}
            {renderField({
              key: 'phone',
              label: 'Phone',
              placeholder: '+1 234 567 8900',
              keyboardType: 'phone-pad',
              nextKey: 'location',
            })}

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Language</Text>
              <View style={styles.optionWrap}>
                {LANGUAGE_OPTIONS.map((language) => {
                  const active = form.language === language.code;
                  return (
                    <TouchableOpacity
                      key={language.code}
                      style={[
                        styles.optionChip,
                        active
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                      ]}
                      onPress={() => updateField('language', language.code)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          active ? { color: colors.white } : { color: colors.text.primary },
                        ]}
                      >
                        {language.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {renderField({
              key: 'location',
              label: 'Location',
              placeholder: 'City / Province',
              autoCapitalize: 'words',
              nextKey: 'farm_size',
            })}

            <TouchableOpacity
              style={[
                styles.currentLocationButton,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
              onPress={useCurrentLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <Ionicons name="locate-outline" size={16} color={colors.primaryDark} />
              )}
              <Text style={styles.currentLocationButtonText}>
                {locating ? 'Detecting location...' : 'Use Current Location'}
              </Text>
            </TouchableOpacity>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Farm Size</Text>
              <TextInput
                ref={(ref) => {
                  fieldRefs.current.farm_size = ref;
                }}
                value={farmSizeValue}
                onChangeText={setFarmSizeValue}
                placeholder="e.g. 10"
                placeholderTextColor={colors.text.secondary}
                style={styles.fieldInput}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                {...AUTOFILL_BLOCK_PROPS}
              />
              <View style={[styles.optionWrap, { marginTop: spacing.xs }]}>
                {FARM_SIZE_UNITS.map((unit) => {
                  const active = farmSizeUnit === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.optionChip,
                        active
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                      ]}
                      onPress={() => setFarmSizeUnit(unit)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          active ? { color: colors.white } : { color: colors.text.primary },
                        ]}
                      >
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <Button
            label={
              loading
                ? 'Loading...'
                : uploadingCover
                  ? 'Uploading Cover...'
                  : uploadingAvatar
                    ? 'Uploading Photo...'
                    : 'Save Changes'
            }
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
  reportIssueQuickLink: {
    marginTop: spacing.sm,
    minHeight: 36,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reportIssueQuickText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },
  coverWrap: {
    width: '100%',
    height: 136,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.xs,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  coverFallbackText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  coverButton: {
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
  coverButtonText: {
    ...typography.bodyBold,
    color: colors.primaryDark,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.sm,
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
  fieldWrap: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  fieldInput: {
    minHeight: 50,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text.primary,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  optionChip: {
    minHeight: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionChipText: {
    ...typography.caption,
    fontWeight: '700',
  },
  currentLocationButton: {
    minHeight: 42,
    borderRadius: radius.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  currentLocationButtonText: {
    ...typography.bodyBold,
    color: colors.primaryDark,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
});

