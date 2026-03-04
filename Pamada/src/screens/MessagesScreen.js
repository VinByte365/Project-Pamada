import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';
import {
  EnhancedInput,
  ScreenHeader,
} from '../components/common';
import { radius, spacing, typography } from '../theme';
import useAppTheme from '../theme/useAppTheme';

export default function MessagesScreen({ navigation, route }) {
  const { palette } = useAppTheme();
  const { token, user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [query, setQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const normalizedQuery = query.trim();

  useEffect(() => {
    let active = true;
    const searchUsers = async () => {
      if (!normalizedQuery) {
        setUserResults([]);
        setSearchingUsers(false);
        return;
      }

      setSearchingUsers(true);
      try {
        const response = await apiRequest(
          `/api/v1/community/messages/users?q=${encodeURIComponent(normalizedQuery)}`,
          {
            method: 'GET',
            token,
          }
        );
        if (!active) return;
        setUserResults(response?.data?.users || []);
      } catch (error) {
        if (!active) return;
        setUserResults([]);
      } finally {
        if (active) setSearchingUsers(false);
      }
    };

    const debounce = setTimeout(searchUsers, 250);
    return () => {
      active = false;
      clearTimeout(debounce);
    };
  }, [normalizedQuery, token]);

  const showingUserSearch = normalizedQuery.length > 0;
  const listData = useMemo(
    () => (showingUserSearch ? userResults : threads),
    [showingUserSearch, userResults, threads]
  );

  const isOnlineUser = (thread) => {
    const timestamp = new Date(thread?.last_message_at || 0).getTime();
    if (!timestamp) return false;
    const minutesSinceLastMessage = (Date.now() - timestamp) / (1000 * 60);
    return minutesSinceLastMessage <= 5;
  };

  const formatThreadDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadThreads();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader
          title="Chats"
          subtitle="Recent conversations"
          onBack={() => navigation.goBack()}
          rightIcon="create-outline"
          onRightPress={() => {}}
          style={styles.header}
        />

        <View style={[styles.searchWrap, { backgroundColor: palette.surface.soft, borderColor: palette.surface.border }]}>
          <EnhancedInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            leftIcon="search-outline"
            rightIcon={searchingUsers ? 'sync-outline' : undefined}
            onRightIconPress={() => {}}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text.tertiary }]}>
          {showingUserSearch ? 'People' : 'Messages'}
        </Text>

        <FlatList
          data={listData}
          keyExtractor={(item) => String(showingUserSearch ? item.id : item.user.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const targetUser = showingUserSearch ? item : item.user;
            const subtitle = showingUserSearch
              ? 'Tap to start conversation'
              : item.last_message || 'No message preview';
            const timeLabel = !showingUserSearch && item.last_message_at
              ? formatThreadDate(item.last_message_at)
              : '';
            const unreadCount = !showingUserSearch ? Number(item.unread_count || 0) : 0;
            const hasUnread = unreadCount > 0;
            const lastMessageFromMe = !showingUserSearch && String(item.last_message_sender_id) === String(myId);
            const lastMessageSeen = Boolean(item.last_message_read_status);
            const statusLabel = showingUserSearch
              ? ''
              : hasUnread
                ? `${unreadCount} unread`
                : lastMessageFromMe
                  ? (lastMessageSeen ? 'Seen' : 'Sent')
                  : 'Read';

            return (
              <TouchableOpacity
                style={styles.threadRow}
                onPress={() =>
                  navigation.navigate('Conversation', {
                    userId: targetUser.id,
                    userName: targetUser.full_name,
                  })
                }
                activeOpacity={0.78}
              >
                <View style={styles.avatarWrap}>
                  {targetUser.profile_image_url ? (
                    <Image source={{ uri: targetUser.profile_image_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: `${palette.primary.solid}20` }]}>
                      <Text style={[styles.avatarText, { color: palette.primary.solid }]}>
                        {targetUser.full_name?.slice(0, 1)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  {!showingUserSearch && isOnlineUser(item) ? (
                    <View
                      style={[
                        styles.onlineDot,
                        {
                          borderColor: palette.background.base,
                          backgroundColor: palette.status.success,
                        },
                      ]}
                    />
                  ) : null}
                </View>

                <View style={styles.threadBody}>
                  <View style={styles.threadHead}>
                    <Text style={[styles.threadName, { color: palette.text.primary }]} numberOfLines={1}>
                      {targetUser.full_name}
                    </Text>
                    {timeLabel ? (
                      <Text style={[styles.time, { color: hasUnread ? palette.primary.solid : palette.text.tertiary }]}>
                        {timeLabel}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.previewRow}>
                    <Text
                      style={[
                        styles.preview,
                        { color: hasUnread ? palette.text.primary : palette.text.secondary },
                      ]}
                      numberOfLines={1}
                    >
                      {subtitle}
                    </Text>
                    {statusLabel ? (
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: hasUnread ? palette.primary.solid : palette.text.tertiary,
                          },
                        ]}
                      >
                        {statusLabel}
                      </Text>
                    ) : null}
                    {hasUnread ? <View style={[styles.unreadDot, { backgroundColor: palette.primary.solid }]} /> : null}
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: palette.text.secondary }]}>
                {showingUserSearch ? 'No users found.' : 'No conversations yet.'}
              </Text>
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
    paddingTop: spacing.sm,
  },
  header: {
    marginBottom: spacing.sm,
    paddingHorizontal: 0,
  },
  searchWrap: {
    borderWidth: 0,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    gap: spacing.xxs,
  },
  threadRow: {
    minHeight: 72,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    ...typography.bodyBold,
    textAlign: 'center',
    lineHeight: 52,
  },
  onlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  threadBody: {
    flex: 1,
  },
  threadHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  threadName: {
    ...typography.bodyBold,
    flex: 1,
  },
  previewRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  preview: {
    ...typography.body,
    flex: 1,
    fontSize: 14,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  time: {
    ...typography.caption,
    fontWeight: '600',
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
  },
});
