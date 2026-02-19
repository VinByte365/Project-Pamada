import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';
import { colors, spacing, radius, typography, shadows } from '../theme';

export default function AboutPamadaScreen({ navigation }) {
  const { token } = useAuth();
  const [about, setAbout] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiRequest('/api/v1/settings/about', {
          method: 'GET',
          token,
        });
        setAbout(response?.data || null);
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to load app information');
      }
    };

    load();
  }, []);

  const openLink = async (url) => {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Unavailable', 'Cannot open this URL on your device');
      return;
    }
    Linking.openURL(url);
  };

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
        <View style={styles.card}>
          <Text style={styles.appName}>{about?.app_name || 'Pamada'}</Text>
          <Text style={styles.description}>{about?.description || 'AI-powered Aloe Vera management app.'}</Text>
          <Text style={styles.itemText}>Version: {about?.version || '1.0.0'}</Text>
          <Text style={styles.itemText}>ML Model: {about?.ml_model || 'AV1.pt'}</Text>
        </View>

        <TouchableOpacity style={styles.linkCard} onPress={() => openLink(about?.privacy_url)}>
          <Text style={styles.linkText}>Privacy Policy</Text>
          <Ionicons name="open-outline" size={18} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkCard} onPress={() => openLink(about?.terms_url)}>
          <Text style={styles.linkText}>Terms and Conditions</Text>
          <Ionicons name="open-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  appName: {
    ...typography.titleLarge,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  itemText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  linkCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});
