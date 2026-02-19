import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';
import { radius, spacing, typography } from '../theme';
import useAppTheme from '../theme/useAppTheme';

export default function MessagesScreen({ navigation, route }) {
  const { palette } = useAppTheme();
  const { token, user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [query, setQuery] = useState('');

  const myId = user?.id || user?._id;
  const initialUserId = route.params?.userId;
  const initialUserName = route.params?.userName || 'User';

  const loadThreads = async () => {
    const response = await apiRequest('/api/v1/community/messages/threads', {
      method: 'GET',
      token,
    });
    const list = response?.data?.threads || [];
    setThreads(
      [...list].sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      loadThreads().catch(() => {});
    }, [token])
  );

  useEffect(() => {
    if (!initialUserId) return;
    if (String(initialUserId) === String(myId)) return;

    navigation.navigate('Conversation', {
      userId: initialUserId,
      userName: initialUserName,
    });
  }, [initialUserId, initialUserName, myId, navigation]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredThreads = useMemo(() => {
    if (!normalizedQuery) return threads;
    return threads.filter((item) => {
      const name = String(item.user?.full_name || '').toLowerCase();
      const preview = String(item.last_message || '').toLowerCase();
      return name.includes(normalizedQuery) || preview.includes(normalizedQuery);
    });
  }, [threads, normalizedQuery]);

  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return threads
      .filter((item) => String(item.user?.full_name || '').toLowerCase().includes(normalizedQuery))
      .slice(0, 5);
  }, [threads, normalizedQuery]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: palette.text.primary }]}>Messages</Text>

        <View style={[styles.searchWrap, { borderColor: palette.surface.border, backgroundColor: palette.surface.light }]}>
          <Ionicons name="search-outline" size={18} color={palette.text.tertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search conversations"
            placeholderTextColor={palette.text.tertiary}
            style={[styles.searchInput, { color: palette.text.primary }]}
          />
        </View>

        {suggestions.length > 0 ? (
          <View style={[styles.suggestionWrap, { borderColor: palette.surface.border, backgroundColor: palette.surface.light }]}>
            {suggestions.map((item) => (
              <TouchableOpacity
                key={`suggest-${item.user.id}`}
                style={styles.suggestionItem}
                onPress={() => {
                  setQuery(item.user.full_name);
                  navigation.navigate('Conversation', {
                    userId: item.user.id,
                    userName: item.user.full_name,
                  });
                }}
              >
                <Text style={[styles.suggestionText, { color: palette.text.primary }]}>{item.user.full_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <FlatList
          data={filteredThreads}
          keyExtractor={(item) => String(item.user.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.threadItem, { borderColor: palette.surface.border, backgroundColor: palette.surface.light }]}
              onPress={() =>
                navigation.navigate('Conversation', {
                  userId: item.user.id,
                  userName: item.user.full_name,
                })
              }
            >
              {item.user.profile_image_url ? (
                <Image source={{ uri: item.user.profile_image_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: `${palette.primary.solid}22` }]}>
                  <Text style={[styles.avatarInitial, { color: palette.primary.solid }]}>
                    {item.user.full_name?.slice(0, 1)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.threadBody}>
                <Text style={[styles.threadName, { color: palette.text.primary }]} numberOfLines={1}>
                  {item.user.full_name}
                </Text>
                <Text style={[styles.preview, { color: palette.text.secondary }]} numberOfLines={1}>
                  {item.last_message}
                </Text>
              </View>
              <Text style={[styles.time, { color: palette.text.tertiary }]}>
                {new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: palette.text.secondary }]}>No conversations yet.</Text>
            </View>
          }
        />
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
  title: {
    ...typography.headline,
  },
  searchWrap: {
    marginTop: spacing.sm,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
  },
  suggestionWrap: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 4,
  },
  suggestionItem: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  suggestionText: {
    ...typography.body,
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.xs,
  },
  threadItem: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...typography.caption,
    fontWeight: '700',
  },
  threadBody: {
    flex: 1,
  },
  threadName: {
    ...typography.bodyBold,
  },
  preview: {
    ...typography.caption,
    marginTop: 2,
  },
  time: {
    ...typography.caption,
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
  },
});
