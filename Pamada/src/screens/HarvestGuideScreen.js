import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { colors, radius, spacing, typography, shadows } from '../theme';

const VIDEO_URL = 'https://videos.pexels.com/video-files/11431472/11431472-uhd_3840_2160_24fps.mp4';

export default function HarvestGuideScreen({ navigation }) {
  const videoHtml = useMemo(
    () => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <style>
      html, body { margin: 0; padding: 0; background: #0b0f0c; height: 100%; }
      .frame {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        background: #0b0f0c;
      }
      video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <video controls playsinline>
        <source src="${VIDEO_URL}" type="video/mp4" />
      </video>
    </div>
  </body>
</html>`,
    []
  );

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
            <Text style={styles.sectionHint}>Open-source stock footage</Text>
          </View>
          <View style={styles.videoFrame}>
            <WebView originWhitelist={['*']} source={{ html: videoHtml }} />
          </View>
          <Text style={styles.videoCaption}>
            Video source: Pexels (free stock footage).
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
