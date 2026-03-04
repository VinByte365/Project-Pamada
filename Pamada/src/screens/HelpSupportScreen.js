import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { apiRequest } from '../utils/api';
import { colors, spacing, radius, typography, shadows } from '../theme';

export default function HelpSupportScreen({ navigation }) {
  const { token } = useAuth();
  const { showSnackbar } = useSnackbar();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contacts, setContacts] = useState(null);
  const [faq, setFaq] = useState([]);
  const [tickets, setTickets] = useState([]);

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
      showSnackbar({ type: 'error', message: error.message || 'Failed to load help information' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageLead}>
          <Text style={styles.pageTitle}>Help & Support</Text>
          <Text style={styles.pageSubtitle}>Get help quickly, submit issues, and track ticket responses.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact</Text>
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.itemText}>{contacts?.email || '-'}</Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.itemText}>{contacts?.hotline || '-'}</Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="time-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.itemText}>{contacts?.hours || '-'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Report a New Issue</Text>
          <Text style={styles.itemText}>Submit a manual ticket with screenshot and device details.</Text>
          <Button
            label="Open Report Form"
            onPress={() => navigation.navigate('ReportIssue')}
            disabled={loading}
            style={{ marginTop: spacing.sm }}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Tickets</Text>
          {tickets.length === 0 ? (
            <Text style={styles.itemText}>No tickets yet.</Text>
          ) : (
            tickets.map((ticket) => (
              <View key={ticket._id} style={styles.ticketRow}>
                <View style={styles.ticketMain}>
                  <Text style={styles.ticketSubject}>{ticket.ticket_number || 'Pending ticket number'}</Text>
                  <Text style={styles.ticketMeta}>{ticket.issue_category_label || 'Other'}</Text>
                  <Text style={styles.ticketMeta}>{new Date(ticket.createdAt).toLocaleString()}</Text>
                </View>
                <View style={styles.statusChip}>
                  <Text style={styles.ticketStatus}>{String(ticket.status || 'open').replace('_', ' ')}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>FAQ</Text>
          {faq.map((item, index) => (
            <View key={`${item.question}-${index}`} style={[styles.faqItem, index === faq.length - 1 && styles.faqItemLast]}>
              <View style={styles.faqQuestionRow}>
                <Ionicons name="help-circle-outline" size={isCompact ? 15 : 16} color={colors.primaryDark} />
                <Text style={styles.faqQuestion}>{item.question}</Text>
              </View>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
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
  pageLead: {
    marginBottom: spacing.md,
  },
  pageTitle: {
    ...typography.bodyBold,
    fontSize: 20,
    color: colors.text.primary,
  },
  pageSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
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
  cardTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  itemText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  ticketMain: {
    flex: 1,
  },
  ticketSubject: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
  ticketMeta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  ticketStatus: {
    ...typography.caption,
    color: colors.primary,
    textTransform: 'capitalize',
    fontWeight: '700',
  },
  faqItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  faqItemLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  faqQuestion: {
    ...typography.bodyBold,
    color: colors.text.primary,
    flex: 1,
  },
  faqAnswer: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
});

