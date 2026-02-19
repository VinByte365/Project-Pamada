import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { radius, shadows, spacing, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

const typeIcon = {
  post_liked: 'heart-outline',
  post_commented: 'chatbubble-ellipses-outline',
  new_message: 'mail-unread-outline',
  harvest_alert: 'leaf-outline',
  health_alert: 'medkit-outline',
  system_announcement: 'megaphone-outline',
};

export default function NotificationFab({ mode = 'floating', style }) {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const { palette } = useAppTheme();
  const { notifications, unreadCount, markRead, markAllRead } = useRealtime();
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [notifications]
  );

  if (!isAuthenticated) return null;

  const isHeader = mode === 'header';

  const handleNotificationPress = async (item) => {
    await markRead(item.id);
    setOpen(false);

    if (item.type === 'new_message') {
      navigation.navigate('Messages');
      return;
    }

    if (item.type === 'post_liked' || item.type === 'post_commented') {
      navigation.navigate('Main', { screen: 'Community' });
      return;
    }

    navigation.navigate('Main', { screen: 'Home' });
  };

  return (
    <>
      <TouchableOpacity
        style={[
          isHeader
            ? [styles.headerIconWrap, { borderColor: palette.surface.border, backgroundColor: palette.surface.light }]
            : [styles.fab, { backgroundColor: palette.accent.action }],
          style,
        ]}
        onPress={() => setOpen(true)}
      >
        <Ionicons
          name="notifications-outline"
          size={isHeader ? 20 : 22}
          color={isHeader ? palette.text.primary : palette.accent.on}
        />
        {unreadCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: palette.accent.action }]}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.panel, { backgroundColor: palette.surface.light, borderColor: palette.surface.border }]}>
            <View style={styles.panelHeader}>
              <Text style={[styles.title, { color: palette.text.primary }]}>Notifications</Text>
              <TouchableOpacity onPress={markAllRead}>
                <Text style={[styles.markAll, { color: palette.primary.solid }]}>Mark all read</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {sorted.length === 0 ? (
                <Text style={[styles.empty, { color: palette.text.secondary }]}>No notifications yet.</Text>
              ) : (
                sorted.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleNotificationPress(item)}
                    style={[
                      styles.item,
                      {
                        backgroundColor: item.is_read ? palette.surface.soft : `${palette.primary.solid}10`,
                        borderColor: palette.surface.border,
                      },
                    ]}
                  >
                    <Ionicons name={typeIcon[item.type] || 'notifications-outline'} size={18} color={palette.primary.solid} />
                    <View style={styles.itemBody}>
                      <Text style={[styles.message, { color: palette.text.primary }]}>{item.message}</Text>
                      <Text style={[styles.time, { color: palette.text.secondary }]}> 
                        {new Date(item.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.screenPadding,
    bottom: 104,
    width: 56,
    height: 56,
    borderRadius: radius.floating,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
    zIndex: 40,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.surface,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  panel: {
    width: '90%',
    maxHeight: '60%',
    marginRight: spacing.screenPadding,
    marginTop: 118,
    borderRadius: radius.card,
    borderWidth: 1,
    ...shadows.floating,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.bodyBold,
  },
  markAll: {
    ...typography.caption,
    fontWeight: '700',
  },
  list: {
    maxHeight: 380,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  item: {
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  itemBody: {
    flex: 1,
  },
  message: {
    ...typography.body,
  },
  time: {
    ...typography.caption,
    marginTop: 2,
  },
  empty: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
