import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { colors, radius, spacing, typography, shadows } from '../theme';

const YOUTUBE_EMBED = 'https://www.youtube-nocookie.com/embed/y8LvkArI6jY?rel=0&modestbranding=1&playsinline=1';
const YOUTUBE_WATCH = 'https://www.youtube.com/watch?v=y8LvkArI6jY';
const YOUTUBE_THUMB = 'https://img.youtube.com/vi/y8LvkArI6jY/hqdefault.jpg';

export default function HarvestGuideScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Harvest Guide</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['rgba(16,185,129,0.18)', 'rgba(16,185,129,0.02)']}
          style={styles.heroCard}
        >
          <Text style={styles.heroTitle}>Harvest Aloe Vera Safely</Text>
          <Text style={styles.heroSubtitle}>
            Step-by-step guidance for selecting mature leaves, cutting cleanly, and preparing gel.
          </Text>
          <View style={styles.heroPills}>
            <View style={styles.heroPill}>
              <Ionicons name="leaf-outline" size={14} color={colors.primary} />
              <Text style={styles.heroPillText}>Fresh leaves only</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
              <Text style={styles.heroPillText}>Low-stress harvest</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.videoCard}>
          <View style={styles.videoHeader}>
            <Text style={styles.sectionTitle}>Harvest Demo Video</Text>
          </View>
          <View style={styles.videoFrame}>
            {Platform.OS === 'android' ? (
              <TouchableOpacity
                style={styles.videoPoster}
                onPress={() => Linking.openURL(YOUTUBE_WATCH).catch(() => {})}
                accessibilityRole="button"
                accessibilityLabel="Open harvest guide video in YouTube"
              >
                <Image source={{ uri: YOUTUBE_THUMB }} style={styles.videoPosterImage} />
                <View style={styles.videoPosterOverlay} />
                <View style={styles.videoPosterBadge}>
                  <Ionicons name="logo-youtube" size={18} color="#FFFFFF" />
                  <Text style={styles.videoPosterText}>Open in YouTube</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <WebView
                originWhitelist={['*']}
                source={{ uri: YOUTUBE_EMBED }}
                javaScriptEnabled
                domStorageEnabled
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction
                allowsInlineMediaPlayback
              />
            )}
          </View>
          <Text style={styles.videoCaption}>
            Video source: The Aloe Vera Garden (opens externally on Android).
          </Text>
        </View>

        <View style={styles.stepsCard}>
          <Text style={styles.sectionTitle}>Step-by-Step</Text>
          {[
            'Choose a mature, outer leaf with firm, thick flesh.',
            'Sanitize a sharp knife to prevent infection.',
            'Cut at the base, close to the stem, in one clean motion.',
            'Let the yellow sap (aloin) drain for 10–15 minutes.',
            'Trim thorny edges, then fillet the leaf to expose gel.',
            'Store gel in a clean container; refrigerate if needed.',
          ].map((step, index) => (
            <View key={`step-${index}`} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.noticeCard}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
          <Text style={styles.noticeText}>
            Only harvest 1–2 leaves at a time to avoid stressing the plant. Allow the plant to recover before the next cut.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    gap: spacing.md,
  },
  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  heroTitle: {
    ...typography.headline,
    color: colors.text.primary,
    fontWeight: '800',
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: `${colors.primary}14`,
  },
  heroPillText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  videoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.sm,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  videoFrame: {
    height: 210,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0b0f0c',
  },
  videoPoster: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPosterImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  videoPosterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  videoPosterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  videoPosterText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  videoCaption: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  stepsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  stepText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
    backgroundColor: `${colors.warning}12`,
  },
  noticeText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
});
