import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';
import { colors, spacing, radius, typography, shadows } from '../theme';

const AUTOFILL_BLOCK_PROPS = Platform.select({
  android: {
    autoComplete: 'off',
    textContentType: 'none',
    importantForAutofill: 'noExcludeDescendants',
  },
  ios: {
    autoComplete: 'off',
    textContentType: 'none',
  },
  default: {
    autoComplete: 'off',
  },
});

export default function HelpSupportScreen({ navigation }) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const categoryRef = useRef(null);
  const subjectRef = useRef(null);
  const messageRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState(null);
  const [faq, setFaq] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [form, setForm] = useState({
    category: 'general',
    subject: '',
    message: '',
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event?.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const ensureVisible = (inputRef) => {
    const field = inputRef?.current;
    const scroll = scrollRef.current;
    if (!field || !scroll || !keyboardHeight) return;

    requestAnimationFrame(() => {
      field.measureInWindow((x, y, width, height) => {
        const windowHeight = Dimensions.get('window').height;
        const keyboardTop = windowHeight - keyboardHeight;
        const fieldBottom = y + height;
        const safeGap = 18;

        if (fieldBottom > keyboardTop - safeGap) {
          const overlap = fieldBottom - (keyboardTop - safeGap);
          scroll.scrollTo({
            y: Math.max(0, scrollYRef.current + overlap + 20),
            animated: true,
          });
        }
      });
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/v1/settings/help', {
        method: 'GET',
        token,
      });
      setContacts(response?.data?.contacts || null);
      setFaq(response?.data?.faq || []);
      setTickets(response?.data?.recent_tickets || []);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load help information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.subject || !form.message) {
      Alert.alert('Validation', 'Please fill in subject and message');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/api/v1/settings/help', {
        method: 'POST',
        token,
        body: JSON.stringify(form),
      });
      setForm({ category: 'general', subject: '', message: '' });
      await load();
      Alert.alert('Submitted', 'Your support ticket has been created');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact</Text>
            <Text style={styles.itemText}>Email: {contacts?.email || '-'}</Text>
            <Text style={styles.itemText}>Hotline: {contacts?.hotline || '-'}</Text>
            <Text style={styles.itemText}>Hours: {contacts?.hours || '-'}</Text>
          </View>

          <View style={[styles.card, styles.ticketCard]}>
            <Text style={styles.cardTitle}>Submit a Ticket</Text>
            <Input
              inputRef={categoryRef}
              onFocus={() => ensureVisible(categoryRef)}
              label="Category"
              value={form.category}
              onChangeText={(value) => setForm((prev) => ({ ...prev, category: value }))}
              placeholder="general / technical / billing / feedback"
              autoCapitalize="none"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              {...AUTOFILL_BLOCK_PROPS}
            />
            <Input
              inputRef={subjectRef}
              onFocus={() => ensureVisible(subjectRef)}
              label="Subject"
              value={form.subject}
              onChangeText={(value) => setForm((prev) => ({ ...prev, subject: value }))}
              placeholder="Brief issue summary"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              {...AUTOFILL_BLOCK_PROPS}
            />
            <Input
              inputRef={messageRef}
              onFocus={() => ensureVisible(messageRef)}
              label="Message"
              value={form.message}
              onChangeText={(value) => setForm((prev) => ({ ...prev, message: value }))}
              placeholder="Tell us what happened"
              multiline
              numberOfLines={4}
              returnKeyType="done"
              blurOnSubmit={false}
              {...AUTOFILL_BLOCK_PROPS}
            />
            <Button label="Submit Ticket" onPress={submit} loading={submitting} disabled={loading} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Tickets</Text>
            {tickets.length === 0 ? (
              <Text style={styles.itemText}>No tickets yet.</Text>
            ) : (
              tickets.map((ticket) => (
                <View key={ticket._id} style={styles.ticketRow}>
                  <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                  <Text style={styles.ticketStatus}>{ticket.status.replace('_', ' ')}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>FAQ</Text>
            {faq.map((item, index) => (
              <View key={`${item.question}-${index}`} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
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
  ticketCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  itemText: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  ticketSubject: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
    paddingRight: spacing.sm,
  },
  ticketStatus: {
    ...typography.caption,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  faqItem: {
    marginBottom: spacing.md,
  },
  faqQuestion: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  faqAnswer: {
    ...typography.body,
    color: colors.text.secondary,
  },
});

