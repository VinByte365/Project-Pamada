import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { apiRequest } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius, typography, shadows } from '../theme';

const initialMessages = [
  {
    id: 'welcome',
    role: 'bot',
    text: 'Hi! I am Pamada AI. Ask me about Aloe Vera care, disease symptoms, or harvest timing.',
  },
];

export default function ChatbotScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const route = useRoute();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);
  const streamVersionRef = useRef(0);
  const prefillAppliedRef = useRef(false);

  const normalizeBotText = (text) => (typeof text === 'string' ? text.normalize('NFC') : '');

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const prefill = String(route?.params?.prefill || '').trim();
    if (!prefill) return;
    setInput(prefill);
    prefillAppliedRef.current = true;
  }, [route?.params?.prefill]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSub = Keyboard.addListener(showEvent, () => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    });

    return () => {
      showSub.remove();
    };
  }, []);

  const appendMessage = (message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setMessages((prev) => [...prev, { id, ...message }]);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return id;
  };

  const streamAssistantMessage = async (text) => {
    const streamId = ++streamVersionRef.current;
    const messageId = appendMessage({ role: 'bot', text: '' });
    const normalized = normalizeBotText(text);
    const codepoints = Array.from(normalized);
    const chunkSize = codepoints.length > 220 ? 4 : 2;

    for (let index = 1; index <= codepoints.length; index += chunkSize) {
      if (streamVersionRef.current !== streamId) return;
      const nextChunk = codepoints.slice(0, index).join('');
      setMessages((prev) =>
        prev.map((item) => (item.id === messageId ? { ...item, text: nextChunk } : item))
      );
      await new Promise((resolve) => setTimeout(resolve, 12));
      if (index % (chunkSize * 6) === 0) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollToEnd({ animated: false });
        });
      }
    }
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    streamVersionRef.current += 1;
    setError('');
    setMessages(initialMessages);
    setTimeout(() => setRefreshing(false), 250);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setInput('');
    setError('');
    appendMessage({ role: 'user', text: trimmed });
    setLoading(true);

    try {
      const response = await apiRequest('/api/chatbot/ask', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed,
          userId: user?.id || user?._id || 'guest',
        }),
      });

      if (response?.success) {
        await streamAssistantMessage(
          response.message || 'I am here to help with Aloe Vera questions.'
        );
      } else {
        throw new Error(response?.error || 'Chatbot did not respond.');
      }
    } catch (err) {
      setError(err.message || 'Unable to reach chatbot service.');
      await streamAssistantMessage('I am having trouble responding right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
        style={styles.keyboard}
      >
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(spacing.lg, insets.top + spacing.sm),
            },
          ]}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="chatbubbles" size={22} color={colors.primary} />
              <Text style={styles.headerTitle}>Pamada Chatbot</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, loading ? styles.statusDotBusy : styles.statusDotReady]} />
              <Text style={styles.statusText}>{loading ? 'Thinking' : 'Ready'}</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Ask about Aloe Vera care, disease, and harvest timing.</Text>
          <View style={styles.headerMetaRow}>
            <View style={styles.headerMetaPill}>
              <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
              <Text style={styles.headerMetaText}>AI Care Assistant</Text>
            </View>
            <View style={styles.headerMetaPill}>
              <Ionicons name="refresh-outline" size={12} color={colors.primary} />
              <Text style={styles.headerMetaText}>Pull to reset chat</Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[styles.messageRow, message.role === 'user' ? styles.userRow : styles.botRow]}
            >
              {message.role === 'bot' ? (
                <View style={styles.avatar}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                </View>
              ) : (
                <View style={styles.avatarSpacer} />
              )}
              <View style={styles.messageBlock}>
                <Text
                  style={[styles.roleText, message.role === 'user' ? styles.userRole : styles.botRole]}
                >
                  {message.role === 'user' ? 'You' : 'Pamada AI'}
                </Text>
                <View
                  style={[
                    styles.bubble,
                    message.role === 'user' ? styles.userBubble : styles.botBubble,
                  ]}
                >
              <Text
                style={[
                  styles.bubbleText,
                  message.role === 'user' ? styles.userText : styles.botText,
                ]}
              >
                {message.text}
              </Text>
            </View>
              </View>
            </View>
          ))}
          {loading ? (
            <View style={[styles.messageRow, styles.botRow]}>
              <View style={styles.avatar}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
              </View>
              <View style={styles.messageBlock}>
                <View style={[styles.bubble, styles.botBubble]}>
                  <View style={styles.typingRow}>
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                  </View>
                  <Text style={styles.typingText}>Pamada AI is typing...</Text>
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={16} color={colors.warning} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={[styles.inputRow, { paddingBottom: Math.max(spacing.md, insets.bottom + spacing.xs) }]}>
          <View style={styles.inputShell}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              onFocus={() => {
                requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
              }}
              placeholder="Ask about Aloe Vera..."
              placeholderTextColor={colors.textHint}
              editable={!loading}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={loading}
            >
              <Ionicons name="send" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  ambientTop: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: `${colors.primary}18`,
  },
  ambientBottom: {
    position: 'absolute',
    bottom: -140,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: `${colors.accent}14`,
  },
  keyboard: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.surface,
    minHeight: 178,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.xs,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.headline,
    fontWeight: '800',
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  headerMetaRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  headerMetaPill: {
    minHeight: 24,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    backgroundColor: `${colors.primary}14`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerMetaText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    minHeight: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotReady: {
    backgroundColor: colors.success,
  },
  statusDotBusy: {
    backgroundColor: colors.warning,
  },
  statusText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  messages: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}14`,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatarSpacer: {
    width: 28,
    height: 28,
  },
  messageBlock: {
    maxWidth: '78%',
  },
  roleText: {
    ...typography.caption,
    marginBottom: spacing.xxs,
  },
  userRole: {
    alignSelf: 'flex-end',
    color: colors.text.secondary,
  },
  botRole: {
    alignSelf: 'flex-start',
    color: colors.primary,
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderTopRightRadius: radius.sm,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderTopLeftRadius: radius.sm,
  },
  bubbleText: {
    ...typography.body,
    lineHeight: 20,
  },
  userText: {
    color: colors.white,
  },
  botText: {
    color: colors.text.primary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.warning,
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.sm,
  },
  inputShell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingRight: spacing.sm,
    color: colors.text.primary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
    opacity: 0.8,
  },
  typingText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 6,
  },
});
