import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import Button from '../components/common/Button';
import ElevatedCard from '../components/ui/ElevatedCard';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useCommunityPostUpload } from '../contexts/CommunityPostUploadContext';
import { radius, spacing, typography } from '../theme';
import useAppTheme from '../theme/useAppTheme';

export default function CreateCommunityPostScreen() {
  const navigation = useNavigation();
  const { palette } = useAppTheme();
  const { user, token } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { isUploading, startPostUpload } = useCommunityPostUpload();
  const [submitting, setSubmitting] = useState(false);
  const [postDraft, setPostDraft] = useState('');
  const [mediaUrlDraft, setMediaUrlDraft] = useState('');
  const [pickedMedia, setPickedMedia] = useState(null);

  const initial = useMemo(
    () => (user?.full_name?.trim()?.[0] || user?.username?.trim()?.[0] || 'U').toUpperCase(),
    [user?.full_name, user?.username]
  );

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (asset) {
      setPickedMedia(asset);
      setMediaUrlDraft('');
    }
  };

  const submitPost = async () => {
    const content = postDraft.trim();
    if (!content && !pickedMedia && !mediaUrlDraft.trim()) {
      showSnackbar({ type: 'warning', message: 'Add text or media before posting.' });
      return;
    }

    setSubmitting(true);
    try {
      navigation.navigate('Main', { screen: 'Community' });
      await startPostUpload({
        token,
        content,
        mediaUrl: mediaUrlDraft.trim(),
        pickedMedia,
      });
    } catch (error) {
      if (error?.code === 'TIMEOUT') {
        showSnackbar({
          type: 'warning',
          message: 'Upload is taking longer than expected. Try a shorter clip or better connection.',
          duration: 4500,
        });
      } else {
        showSnackbar({ type: 'error', message: error.message || 'Failed to create post' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={[styles.content, styles.centeredContent]} keyboardShouldPersistTaps="handled">
          <View style={[styles.header, { borderColor: palette.surface.border, backgroundColor: palette.surface.light }]}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={palette.text.primary} />
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, { color: palette.text.primary }]}>Create Blog Post</Text>
              <Text style={[styles.subtitle, { color: palette.text.secondary }]}>
                Share a concise update, photo, or short video.
              </Text>
            </View>
            <View style={{ width: 20 }} />
          </View>

          <ElevatedCard style={[styles.card, { borderColor: palette.surface.border }]}>
            <View style={styles.authorRow}>
              <View style={[styles.avatar, { backgroundColor: `${palette.primary.solid}22` }]}>
                <Text style={[styles.avatarInitial, { color: palette.primary.solid }]}>{initial}</Text>
              </View>
              <Text style={[styles.authorName, { color: palette.text.primary }]}>{user?.full_name || 'Grower'}</Text>
            </View>

            <TextInput
              value={postDraft}
              onChangeText={setPostDraft}
              multiline
              style={[styles.postInput, { color: palette.text.primary, borderColor: palette.surface.border }]}
              placeholder="What's happening in your aloe vera garden?"
              placeholderTextColor={palette.text.tertiary}
            />

            <TouchableOpacity
              style={[styles.pickMediaBtn, { borderColor: palette.surface.border, backgroundColor: palette.surface.soft }]}
              onPress={pickMedia}
            >
              <Ionicons name="image-outline" size={16} color={palette.text.primary} />
              <Text style={[styles.pickMediaText, { color: palette.text.primary }]}>
                {pickedMedia ? 'Change media' : 'Upload image or video'}
              </Text>
            </TouchableOpacity>

            {pickedMedia ? (
              <View style={styles.previewWrap}>
                {pickedMedia?.mimeType?.includes('video') ? (
                  <View style={[styles.videoPreviewWrap, { backgroundColor: palette.surface.soft }]}>
                    <Ionicons name="videocam-outline" size={36} color={palette.primary.solid} />
                    <Text style={[styles.videoTapText, { color: palette.text.secondary }]}>Video selected</Text>
                  </View>
                ) : (
                  <Image source={{ uri: pickedMedia.uri }} style={styles.mediaPreview} />
                )}
              </View>
            ) : null}

            <TextInput
              value={mediaUrlDraft}
              onChangeText={setMediaUrlDraft}
              style={[styles.mediaInput, { color: palette.text.primary, borderColor: palette.surface.border }]}
              placeholder="Optional media URL"
              placeholderTextColor={palette.text.tertiary}
              autoCapitalize="none"
            />

            <View style={styles.actions}>
              <Button label="Cancel" type="secondary" onPress={() => navigation.goBack()} style={styles.actionBtn} />
              <Button
                label={submitting || isUploading ? 'Posting...' : 'Publish'}
                onPress={submitPost}
                style={styles.actionBtn}
                disabled={submitting || isUploading}
              />
            </View>
          </ElevatedCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  keyboardView: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  centeredContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  header: {
    minHeight: 74,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTextWrap: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  title: { ...typography.bodyBold, marginTop: spacing.xs },
  subtitle: { ...typography.caption, marginTop: 2, lineHeight: 18 },
  card: { borderWidth: 1, padding: spacing.lg },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...typography.bodyBold },
  authorName: { ...typography.bodyBold },
  postInput: {
    minHeight: 140,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  pickMediaBtn: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.pill,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pickMediaText: { ...typography.caption, fontWeight: '700' },
  previewWrap: { marginTop: spacing.sm },
  mediaPreview: { width: '100%', height: 210, borderRadius: radius.lg },
  videoPreviewWrap: { height: 210, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  videoTapText: { ...typography.caption, marginTop: spacing.xs },
  mediaInput: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.pill,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  actions: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
});
