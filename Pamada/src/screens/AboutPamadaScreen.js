import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '../theme';

export default function AboutPamadaScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const cardWidth = width >= 420 ? '48.5%' : '100%';

  // TODO(edit-members): Replace these placeholders with actual group members and photos.
  // Example image source once you add local assets:
  // photo: require('../../assets/member-1.jpg')
  const members = [
    {
      id: 'member-1',
      name: 'Melvin Catuera',
      title: 'Team Lead - Backend Developer',
      role: 'Responsible for overall project direction, backend service architecture, and core API implementation across the Vera platform.',
      highlights: [
        'Led project planning and backend architecture decisions',
        'Implemented server-side modules and integration endpoints',
        'Coordinated technical delivery across the development team',
      ],
      photo: 'https://res.cloudinary.com/dhsevwka1/image/upload/v1772682841/IMG_20240424_194336_847-removebg-preview_xevr6i.png',
      social: [
        { key: 'github', label: 'GitHub', url: 'https://github.com/VinByte365' },
        { key: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/melvin.catuera' },
      ],
      badgeIcon: 'construct-outline',
    },
    {
      id: 'member-2',
      name: 'John Louis Dadivas',
      title: 'Backend Developer',
      role: 'Focused on API workflow design, backend reliability, and data operations supporting the ticketing and community modules.',
      highlights: [
        'Developed backend routes and ticketing/community data flows',
        'Supported database integration and model consistency',
        'Improved backend response handling for frontend modules',
      ],
      photo: 'https://res.cloudinary.com/dhsevwka1/image/upload/v1772714098/lalaya_y1hwvc.png',
      social: [
        { key: 'github', label: 'GitHub', url: 'https://github.com/jldadivas' },
        { key: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/johnlouis.dadivas' },
      ],
      badgeIcon: 'server-outline',
    },
    {
      id: 'member-3',
      name: 'Hazel Anne Elumba',
      title: 'Frontend Developer',
      role: 'Handled UI implementation, responsive layout behavior, and maintaining visual consistency across all user-facing components.',
      highlights: [
        'Built and refined key user-facing page interfaces',
        'Improved component styling and layout responsiveness',
        'Ensured clean visual hierarchy across all modules',
      ],
      photo: 'https://res.cloudinary.com/dhsevwka1/image/upload/v1772682841/haz_sldnfj.jpg',
      social: [
        { key: 'github', label: 'GitHub', url: 'https://github.com/anne-1205' },
        { key: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/hazel.anne.573818' },
      ],
      badgeIcon: 'color-palette-outline',
    },
    {
      id: 'member-4',
      name: 'Maria Alyssha Sacay',
      title: 'Frontend Developer',
      role: 'Drove user experience polish, page-level styling decisions, and frontend consistency across the entire application.',
      highlights: [
        'Contributed to frontend feature implementation and visual polish',
        'Improved UI clarity for analytics and content-heavy pages',
        'Supported cohesive visual design system across all screens',
      ],
      photo: 'https://res.cloudinary.com/dhsevwka1/image/upload/v1772682843/wawawawa_bk3mcr.png',
      social: [
        { key: 'github', label: 'GitHub', url: 'https://github.com/aihruu' },
        { key: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/a102504' },
      ],
      badgeIcon: 'sparkles-outline',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Pamada</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.pageTitle}>About Pamada</Text>
          <Text style={styles.pageSubtitle}>
            Pamada helps growers monitor Aloe Vera health with AI-powered scan analysis, maturity tracking, and clear
            treatment guidance.
          </Text>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="leaf-outline" size={16} color={colors.primary} />
              <Text style={styles.heroBadgeText}>AI-Powered Aloe Vera Care</Text>
            </View>
            <View style={styles.heroBadgeSoft}>
              <Ionicons name="analytics-outline" size={16} color={colors.primary} />
              <Text style={styles.heroBadgeText}>Real-Time Health Insights</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Team Members</Text>
          <Text style={styles.sectionSubtitle}>Meet the team that built the Pamada platform.</Text>
        </View>

        <View style={styles.grid}>
          {members.map((member) => (
            <View key={member.id} style={[styles.memberCard, { width: cardWidth }]}>
              <View style={styles.memberHeader}>
                <View style={styles.photoWrap}>
                  {member.photo ? (
                    <Image source={{ uri: member.photo }} style={styles.memberPhoto} />
                  ) : (
                    <Ionicons name="person-outline" size={34} color={colors.text.secondary} />
                  )}
                </View>
                <View style={styles.memberMeta}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberTitle}>{member.title}</Text>
                </View>
                <View style={styles.memberIconBadge}>
                  <Ionicons name={member.badgeIcon} size={18} color={colors.primary} />
                </View>
              </View>

              <Text style={styles.memberRole}>{member.role}</Text>

              <View style={styles.memberTags}>
                {(member.social || []).map((item) => (
                  <TouchableOpacity
                    key={`${member.id}-${item.key}`}
                    style={styles.tagPill}
                    onPress={() => {
                      if (item.url) {
                        Linking.openURL(item.url).catch(() => {});
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${member.name} ${item.label}`}
                  >
                    <Ionicons
                      name={item.key === 'github' ? 'logo-github' : 'logo-facebook'}
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.tagText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.highlightList}>
                {(member.highlights || []).map((item, index) => (
                  <View key={`${member.id}-hl-${index}`} style={styles.highlightRow}>
                    <View style={styles.highlightBar} />
                    <Text style={styles.highlightText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
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
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: `${colors.primary}14`,
  },
  heroBadgeSoft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: `${colors.primary}0F`,
  },
  heroBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  sectionHead: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
  pageTitle: {
    ...typography.title,
    color: colors.text.primary,
  },
  pageSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  memberCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'stretch',
    ...shadows.sm,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  photoWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberPhoto: {
    width: '100%',
    height: '100%',
  },
  memberMeta: {
    flex: 1,
  },
  memberIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },
  memberTitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  memberRole: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  memberTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    backgroundColor: `${colors.primary}10`,
  },
  tagText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  highlightList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  highlightBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 6,
    height: 18,
  },
  highlightText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
});
