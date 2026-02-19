import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { apiRequest } from '../utils/api';
import { radius, spacing, typography } from '../theme';
import useAppTheme from '../theme/useAppTheme';

const formatTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ConversationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const { token, user } = useAuth();
  const { socket } = useRealtime();
  const listRef = useRef(null);
  const myId = String(user?.id || user?._id || '');
  const userId = String(route.params?.userId || '');
  const initialName = route.params?.userName || 'Conversation';

  const [participant, setParticipant] = useState({ id: userId, full_name: initialName });
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const title = useMemo(
    () => participant?.full_name || initialName || 'Conversation',
    [participant?.full_name, initialName]
  );

  const loadMessages = useCallback(async () => {
    if (!userId || !token) return;
    const response = await apiRequest(`/api/v1/community/messages/${userId}`, {
      method: 'GET',
      token,
    });
    const data = response?.data || {};
    const remoteUser = data.user || { id: userId, full_name: initialName };
    setParticipant(remoteUser);
    setMessages(data.messages || []);
  }, [initialName, token, userId]);

  useFocusEffect(
    useCallback(() => {
      loadMessages().catch(() => {});
    }, [loadMessages])
  );

  useEffect(() => {
    if (!socket || !userId) return undefined;

    const onNewMessage = (payload) => {
      const senderId = String(payload?.sender_id || '');
      const receiverId = String(payload?.receiver_id || '');
      const belongsToThread =
        (senderId === userId && receiverId === myId) || (senderId === myId && receiverId === userId);

      if (!belongsToThread) return;
      setMessages((prev) => {
        if (prev.some((item) => String(item.id) === String(payload.id))) return prev;
        return [...prev, payload];
      });
    };

    socket.on('message:new', onNewMessage);
    return () => {
      socket.off('message:new', onNewMessage);
    };
  }, [myId, socket, userId]);

  useEffect(() => {
    if (!userId) {
      navigation.goBack();
      return;
    }
    if (userId === myId) {
      navigation.goBack();
    }
  }, [myId, navigation, userId]);

  const sendMessage = async () => {
    if (sending) return;
    const content = draft.trim();
    if (!content || !userId || userId === myId) return;
    setSending(true);
    try {
      await apiRequest(`/api/v1/community/messages/${userId}`, {
        method: 'POST',
        token,
        body: JSON.stringify({ content }),
      });
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={20} color={palette.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text.primary }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = String(item.sender_id) === myId;
            return (
              <View
                style={[
                  styles.messageRow,
                  mine ? styles.messageRowMine : styles.messageRowOther,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    mine
                      ? { backgroundColor: palette.primary.solid }
                      : {
                          backgroundColor: palette.surface.light,
                          borderColor: palette.surface.border,
                        },
                  ]}
                >
                  <Text style={[styles.messageText, { color: mine ? palette.primary.on : palette.text.primary }]}>
                    {item.content}
                  </Text>
                  <Text
                    style={[
                      styles.time,
                      {
                        color: mine
                          ? `${palette.primary.on}CC`
                          : palette.text.tertiary,
                        textAlign: 'right',
                      },
                    ]}
                  >
                    {formatTime(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: palette.text.secondary }]}>
                No messages yet. Start the conversation.
              </Text>
            </View>
          }
        />

        <View
          style={[
            styles.composer,
            {
              borderColor: palette.surface.border,
              backgroundColor: palette.surface.light,
              marginBottom: Math.max(spacing.xs, insets.bottom),
            },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message"
            placeholderTextColor={palette.text.tertiary}
            style={[styles.input, { color: palette.text.primary }]}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: draft.trim() ? palette.primary.solid : palette.surface.soft,
              },
            ]}
            onPress={sendMessage}
            disabled={!draft.trim() || sending}
          >
            <Ionicons
              name="arrow-up"
              size={16}
              color={draft.trim() ? palette.primary.on : palette.text.tertiary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.title,
    flex: 1,
    textAlign: 'center',
  },
  keyboard: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  messageRow: {
    width: '100%',
    flexDirection: 'row',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  messageText: {
    ...typography.body,
  },
  time: {
    ...typography.caption,
    marginTop: 4,
    fontSize: 11,
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
  },
  composer: {
    borderTopWidth: 1,
    marginHorizontal: spacing.screenPadding,
    borderRadius: radius.md,
    minHeight: 52,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.body,
    maxHeight: 120,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});
