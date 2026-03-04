import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/common/Button';
import ElevatedCard from '../components/ui/ElevatedCard';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { apiRequest } from '../utils/api';
import { radius, spacing, typography } from '../theme';
import useAppTheme from '../theme/useAppTheme';

const DEFAULT_PROFILE_COVER = require('../../assets/aloe-vera.png');

export default function PublicProfileScreen({ route }) {
  const navigation = useNavigation();
  const { palette } = useAppTheme();
  const { token } = useAuth();
  const { showSnackbar } = useSnackbar();
  const userId = route.params?.userId;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const initials = useMemo(() => {
    const name = profile?.full_name || '';
    const parts = name.split(/\s+/).filter(Boolean);
    return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() || 'U';
  }, [profile?.full_name]);

  const load = async () => {
    try {
      const response = await apiRequest(`/api/v1/community/profiles/${userId}`, {
        method: 'GET',
        token,
      });
      setProfile(response?.data?.profile || null);
      setPosts(response?.data?.posts || []);
    } catch (error) {
      showSnackbar({ type: 'error', message: error.message || 'Failed to load profile' });
    }
  };

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const joinedAt = profile?.created_at || profile?.createdAt;
  const joinedLabel = joinedAt
    ? new Date(joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
    : 'Unknown';
  const coverImageSource = profile?.cover_image_url ? { uri: profile.cover_image_url } : DEFAULT_PROFILE_COVER;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, styles.centeredContent]}>
        {profile ? (
          <>
            <ElevatedCard style={[styles.heroCard, { borderColor: palette.surface.border }]}>
              <Image source={coverImageSource} style={styles.cover} resizeMode="cover" />
              <View style={[styles.coverDivider, { backgroundColor: palette.surface.border }]} />
              <View style={styles.heroContent}>
                <View style={[styles.avatarFrame, { borderColor: palette.surface.light }]}>
                  {profile.profile_image_url ? (
                    <Image source={{ uri: profile.profile_image_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: `${palette.primary.solid}22` }]}>
                      <Text style={[styles.initials, { color: palette.primary.solid }]}>{initials}</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.name, { color: palette.text.primary }]}>{profile.full_name}</Text>
                <Text style={[styles.meta, { color: palette.text.secondary }]}>{profile.bio || 'Aloe Vera community member'}</Text>

                <View style={styles.infoRow}>
                  <View style={[styles.infoPill, { backgroundColor: palette.surface.soft, borderColor: palette.surface.border }]}>
                    <Ionicons name="document-text-outline" size={14} color={palette.text.secondary} />
                    <Text style={[styles.infoPillText, { color: palette.text.secondary }]}>{posts.length} Posts</Text>
                  </View>
                  <View style={[styles.infoPill, { backgroundColor: palette.surface.soft, borderColor: palette.surface.border }]}>
                    <Ionicons name="calendar-outline" size={14} color={palette.text.secondary} />
                    <Text style={[styles.infoPillText, { color: palette.text.secondary }]}>Joined {joinedLabel}</Text>
                  </View>
                </View>

                <Button
                  label="Message"
                  onPress={() => navigation.navigate('Messages', { userId: profile.id, userName: profile.full_name })}
                  style={styles.msgBtn}
                />
              </View>
            </ElevatedCard>

            <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Posts</Text>
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              renderItem={({ item }) => (
                <ElevatedCard style={[styles.postCard, { borderColor: palette.surface.border }]}>
                  <Text style={[styles.postContent, { color: palette.text.primary }]}>{item.content}</Text>
                  <View style={styles.postMetaRow}>
                    <Text style={[styles.postMeta, { color: palette.text.secondary }]}>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={[styles.postMeta, { color: palette.text.secondary }]}>
                      {item.likes_count || 0} likes - {item.comments_count || 0} comments
                    </Text>
                  </View>
                </ElevatedCard>
              )}
            />
          </>
        ) : (
          <Text style={[styles.loading, { color: palette.text.secondary }]}>Loading profile...</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
  },
  centeredContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  heroCard: {
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
  },
  cover: {
    height: 120,
  },
  coverDivider: {
    height: 2,
    width: '100%',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    marginTop: -42,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFrame: {
    borderWidth: 3,
    borderRadius: 48,
    padding: 1,
  },
  initials: {
    ...typography.titleLarge,
  },
  name: {
    ...typography.titleLarge,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  meta: {
    ...typography.body,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  msgBtn: {
    width: '100%',
    marginTop: spacing.md,
  },
  infoRow: {
    marginTop: spacing.sm,
    width: '100%',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  infoPill: {
    flex: 1,
    minHeight: 34,
    borderWidth: 1,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  infoPillText: {
    ...typography.caption,
    fontWeight: '700',
  },
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  postCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  postContent: {
    ...typography.body,
    lineHeight: 22,
  },
  postMeta: {
    ...typography.caption,
  },
  postMetaRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  loading: {
    ...typography.body,
    marginTop: spacing.lg,
  },
});
