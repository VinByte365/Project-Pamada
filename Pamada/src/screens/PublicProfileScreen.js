import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Button from '../components/common/Button';
import ElevatedCard from '../components/ui/ElevatedCard';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';
import { radius, spacing, typography } from '../theme';
import useAppTheme from '../theme/useAppTheme';

export default function PublicProfileScreen({ route }) {
  const navigation = useNavigation();
  const { palette } = useAppTheme();
  const { token } = useAuth();
  const userId = route.params?.userId;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);

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
      Alert.alert('Error', error.message || 'Failed to load profile');
    }
  };

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {profile ? (
          <>
            <ElevatedCard style={styles.heroCard}>
              {profile.profile_image_url ? (
                <Image source={{ uri: profile.profile_image_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: `${palette.primary.solid}22` }]}>
                  <Text style={[styles.initials, { color: palette.primary.solid }]}>{initials}</Text>
                </View>
              )}
              <Text style={[styles.name, { color: palette.text.primary }]}>{profile.full_name}</Text>
              <Text style={[styles.meta, { color: palette.text.secondary }]}>{profile.bio || 'Aloe Vera community member'}</Text>
              <Button
                label="Message"
                onPress={() => navigation.navigate('Messages', { userId: profile.id, userName: profile.full_name })}
                style={styles.msgBtn}
              />
            </ElevatedCard>

            <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Posts</Text>
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <ElevatedCard style={styles.postCard}>
                  <Text style={[styles.postContent, { color: palette.text.primary }]}>{item.content}</Text>
                  <Text style={[styles.postMeta, { color: palette.text.secondary }]}> 
                    {item.likes_count || 0} likes · {item.comments_count || 0} comments
                  </Text>
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
    paddingTop: spacing.xs,
  },
  heroCard: {
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...typography.titleLarge,
  },
  name: {
    ...typography.titleLarge,
    marginTop: spacing.sm,
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
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  postCard: {
    padding: spacing.md,
  },
  postContent: {
    ...typography.body,
  },
  postMeta: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  loading: {
    ...typography.body,
    marginTop: spacing.lg,
  },
});
