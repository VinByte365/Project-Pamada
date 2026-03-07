import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
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
    { id: 'member-1', name: 'Melvin Catuera', role: 'Backend Developer / UI/UX Designer / Mobile', photo: 'https://res.cloudinary.com/dhsevwka1/image/upload/v1772682841/IMG_20240424_194336_847-removebg-preview_xevr6i.png' },
    { id: 'member-2', name: 'John Louis Dadivas', role: '', photo: 'https://res.cloudinary.com/dhsevwka1/image/upload/v1772714098/lalaya_y1hwvc.png' },
    { id: 'member-3', name: 'Hazel Anne Elumba', role: 'Frontend Developer / UI/UX Designer / Website', photo: 'https://res.cloudinary.com/dhsevwka1/image/upload/v1772682841/haz_sldnfj.jpg' },
    { id: 'member-4', name: 'Maria Alyssha Sacay', role: '', photo: 'https://res.cloudinary.com/dhsevwka1/image/upload/v1772682843/wawawawa_bk3mcr.png'},
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
            Pamada helps growers monitor Aloe Vera health with AI-powered scan analysis and actionable insights.
          </Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Team Members</Text>
          <Text style={styles.sectionSubtitle}>Replace placeholders with your real member data and photos.</Text>
        </View>

        <View style={styles.grid}>
          {members.map((member) => (
            <View key={member.id} style={[styles.memberCard, { width: cardWidth }]}>
              <View style={styles.photoPlaceholder}>
                {member.photo ? (
                  <Image source={member.photo} style={styles.memberPhoto} />
                ) : (
                  <Ionicons name="person-outline" size={34} color={colors.text.secondary} />
                )}
              </View>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
              {/* TODO(edit-members): Replace placeholder text and photo for this member card. */}
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
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  photoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  memberPhoto: {
    width: '100%',
    height: '100%',
  },
  memberName: {
    ...typography.bodyBold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  memberRole: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
});
