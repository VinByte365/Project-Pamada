import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

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
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, ...message }]);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
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
        appendMessage({
          role: 'bot',
          text: response.message || 'I am here to help with Aloe Vera questions.',
        });
      } else {
        throw new Error(response?.error || 'Chatbot did not respond.');
      }
    } catch (err) {
      setError(err.message || 'Unable to reach chatbot service.');
      appendMessage({
        role: 'bot',
        text: 'I am having trouble responding right now. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
        style={styles.keyboard}
      >
        <View style={styles.header}>
          <Ionicons name="chatbubbles" size={22} color={colors.primary} />
          <Text style={styles.headerTitle}>Pamada Chatbot</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
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
          ))}
          {loading ? (
            <View style={[styles.bubble, styles.botBubble]}>
              <View style={styles.typingRow}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
              <Text style={styles.typingText}>Pamada AI is typing...</Text>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.title,
    color: colors.text.primary,
  },
  messages: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bubbleText: {
    ...typography.body,
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
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    color: colors.text.primary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
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
