import React, { useMemo, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { apiRequest } from '../utils/api';
import { colors, radius, shadows, spacing, typography } from '../theme';

const ISSUE_CATEGORIES = [
  { value: 'detection_error', label: 'Detection Error' },
  { value: 'maturity_misclassification', label: 'Maturity Misclassification' },
  { value: 'disease_misclassification', label: 'Disease Misclassification' },
  { value: 'app_crash', label: 'App Crash' },
  { value: 'performance_issue', label: 'Performance Issue' },
  { value: 'other', label: 'Other' },
];

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

const detectMimeType = (uri = '') => {
  const lower = String(uri).toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
};

export default function ReportIssueScreen({ navigation, route }) {
  const { token, user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const insets = useSafeAreaInsets();
  const fieldRefs = useRef({});
  const [pickingImage, setPickingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [form, setForm] = useState({
    full_name: route?.params?.full_name || user?.full_name || '',
    email: route?.params?.email || user?.email || '',
    mobile_unit: route?.params?.mobile_unit || Platform.OS,
    os_version: route?.params?.os_version || String(Platform.Version || ''),
    issue_category: route?.params?.issue_category || 'detection_error',
    description: route?.params?.description || '',
  });
  const [imageAsset, setImageAsset] = useState(
    route?.params?.imageUri
      ? {
          uri: route.params.imageUri,
          name: `issue-${Date.now()}.jpg`,
          type: detectMimeType(route.params.imageUri),
        }
      : null
  );

  const selectedCategory = useMemo(
    () => ISSUE_CATEGORIES.find((item) => item.value === form.issue_category) || ISSUE_CATEGORIES[0],
    [form.issue_category]
  );

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    setPickingImage(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showSnackbar({ type: 'warning', message: 'Please allow photo access to upload an issue image.' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const picked = result.assets[0];
      const mimeType = picked?.mimeType || detectMimeType(picked.uri);
      if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
        showSnackbar({ type: 'warning', message: 'Please select a JPG or PNG image.' });
        return;
      }

      setImageAsset({
        uri: picked.uri,
        type: mimeType,
        name: picked.fileName || `issue-${Date.now()}${mimeType === 'image/png' ? '.png' : '.jpg'}`,
      });
    } catch (error) {
      showSnackbar({ type: 'error', message: error.message || 'Failed to pick image' });
    } finally {
      setPickingImage(false);
    }
  };

  const validate = () => {
    if (
      !form.full_name.trim() ||
      !form.email.trim() ||
      !form.mobile_unit.trim() ||
      !form.os_version.trim() ||
      !form.issue_category.trim() ||
      !form.description.trim()
    ) {
      showSnackbar({ type: 'warning', message: 'Please complete all required fields.' });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim().toLowerCase())) {
      showSnackbar({ type: 'warning', message: 'Please enter a valid email address.' });
      return false;
    }

    if (!imageAsset?.uri) {
      showSnackbar({ type: 'warning', message: 'Please upload an issue image (JPG/PNG).' });
      return false;
    }

    return true;
  };

  const submit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('full_name', form.full_name.trim());
      payload.append('email', form.email.trim().toLowerCase());
      payload.append('mobile_unit', form.mobile_unit.trim());
      payload.append('os_version', form.os_version.trim());
      payload.append('issue_category', form.issue_category);
      payload.append('description', form.description.trim());
      payload.append('image', {
        uri: imageAsset.uri,
        name: imageAsset.name || `issue-${Date.now()}.jpg`,
        type: imageAsset.type || detectMimeType(imageAsset.uri),
      });

      const response = await apiRequest('/api/v1/settings/help', {
        method: 'POST',
        token,
        body: payload,
      });

      const ticketNumber = response?.data?.ticket?.ticket_number || 'Pending';
      showSnackbar({ type: 'success', message: `Ticket submitted: ${ticketNumber}` });
      navigation.replace('HelpSupport');
    } catch (error) {
      showSnackbar({ type: 'error', message: error.message || 'Failed to submit ticket' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Issue</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Manual Ticket Form</Text>
            <Text style={styles.pageSubtitle}>All fields are required.</Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                ref={(ref) => {
                  fieldRefs.current.full_name = ref;
                }}
                value={form.full_name}
                onChangeText={(value) => updateField('full_name', value)}
                placeholder="Enter full name"
                placeholderTextColor={colors.text.secondary}
                style={styles.fieldInput}
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => fieldRefs.current.email?.focus?.()}
                {...AUTOFILL_BLOCK_PROPS}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                ref={(ref) => {
                  fieldRefs.current.email = ref;
                }}
                value={form.email}
                onChangeText={(value) => updateField('email', value)}
                placeholder="you@example.com"
                placeholderTextColor={colors.text.secondary}
                style={styles.fieldInput}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => fieldRefs.current.mobile_unit?.focus?.()}
                {...AUTOFILL_BLOCK_PROPS}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Mobile Unit</Text>
              <TextInput
                ref={(ref) => {
                  fieldRefs.current.mobile_unit = ref;
                }}
                value={form.mobile_unit}
                onChangeText={(value) => updateField('mobile_unit', value)}
                placeholder="e.g. Samsung Galaxy A54"
                placeholderTextColor={colors.text.secondary}
                style={styles.fieldInput}
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => fieldRefs.current.os_version?.focus?.()}
                {...AUTOFILL_BLOCK_PROPS}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>OS Version</Text>
              <TextInput
                ref={(ref) => {
                  fieldRefs.current.os_version = ref;
                }}
                value={form.os_version}
                onChangeText={(value) => updateField('os_version', value)}
                placeholder="e.g. Android 15"
                placeholderTextColor={colors.text.secondary}
                style={styles.fieldInput}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => fieldRefs.current.description?.focus?.()}
                {...AUTOFILL_BLOCK_PROPS}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Issue Category</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowCategoryModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Select issue category"
              >
                <Text style={styles.dropdownText}>{selectedCategory.label}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                ref={(ref) => {
                  fieldRefs.current.description = ref;
                }}
                value={form.description}
                onChangeText={(value) => updateField('description', value)}
                placeholder="Describe what happened and what you expected."
                placeholderTextColor={colors.text.secondary}
                style={[styles.fieldInput, styles.fieldInputMultiline]}
                multiline
                textAlignVertical="top"
                autoCapitalize="sentences"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                {...AUTOFILL_BLOCK_PROPS}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Image Upload (JPG/PNG)</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickImage}
                disabled={pickingImage}
              >
                <Ionicons name="image-outline" size={18} color={colors.primaryDark} />
                <Text style={styles.uploadButtonText}>{pickingImage ? 'Opening gallery...' : 'Choose Image'}</Text>
              </TouchableOpacity>
              {imageAsset?.uri ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: imageAsset.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImage}
                    onPress={() => setImageAsset(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove selected image"
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                    <Text style={styles.removeImageText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.imageHint}>No image selected yet.</Text>
              )}
            </View>
          </View>

          <Button label="Submit Ticket" onPress={submit} loading={submitting} disabled={submitting} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showCategoryModal} transparent animationType="fade" onRequestClose={() => setShowCategoryModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowCategoryModal(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Issue Category</Text>
            {ISSUE_CATEGORIES.map((category) => {
              const active = category.value === form.issue_category;
              return (
                <TouchableOpacity
                  key={category.value}
                  style={[styles.modalOption, active && styles.modalOptionActive]}
                  onPress={() => {
                    updateField('issue_category', category.value);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>{category.label}</Text>
                  {active ? <Ionicons name="checkmark" size={16} color={colors.primaryDark} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
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
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    ...shadows.sm,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },
  pageSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
    marginBottom: spacing.md,
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
  fieldInputMultiline: {
    minHeight: 120,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  dropdown: {
    minHeight: 50,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    ...typography.body,
    color: colors.text.primary,
  },
  uploadButton: {
    minHeight: 44,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  uploadButtonText: {
    ...typography.bodyBold,
    color: colors.primaryDark,
  },
  previewWrap: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.surfaceAlt,
  },
  removeImage: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
  },
  removeImageText: {
    ...typography.bodyBold,
    color: colors.error,
  },
  imageHint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadows.md,
  },
  modalTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  modalOption: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  modalOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modalOptionText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  modalOptionTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
