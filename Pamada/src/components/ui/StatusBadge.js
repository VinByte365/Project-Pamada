import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

const badgeMap = {
  healthy: { icon: 'checkmark-circle', tone: 'success', label: 'Healthy' },
  ready: { icon: 'leaf', tone: 'success', label: 'Ready' },
  harvested: { icon: 'checkmark-done', tone: 'info', label: 'Harvested' },
  leaf_spot: { icon: 'warning', tone: 'warning', label: 'Leaf Spot' },
  root_rot: { icon: 'alert-circle', tone: 'danger', label: 'Root Rot' },
  sunburn: { icon: 'sunny', tone: 'warning', label: 'Sunburn' },
  aloe_rust: { icon: 'warning', tone: 'warning', label: 'Aloe Rust' },
  bacterial_soft_rot: { icon: 'alert-circle', tone: 'danger', label: 'Bacterial Soft Rot' },
  anthracnose: { icon: 'alert-circle', tone: 'danger', label: 'Anthracnose' },
  scale_insect: { icon: 'bug', tone: 'warning', label: 'Scale Insect' },
  mealybug: { icon: 'bug', tone: 'warning', label: 'Mealybug' },
  spider_mite: { icon: 'bug', tone: 'warning', label: 'Spider Mite' },
  watering: { icon: 'water', tone: 'watering', label: 'Watering' },
};

export default function StatusBadge({ status = 'healthy', label }) {
  const { palette } = useAppTheme();
  const normalizedStatus = String(status || '').toLowerCase();
  const fallbackLabel = normalizedStatus
    ? normalizedStatus.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    : 'Unknown';
  const item = badgeMap[normalizedStatus] || { icon: 'warning', tone: 'warning', label: fallbackLabel };
  const color = palette.status[item.tone] || palette.status.success;

  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
      <Ionicons name={item.icon} size={12} color={color} />
      <Text style={[styles.text, { color }]}>{label || item.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 28,
    borderWidth: 1,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.caption,
    fontWeight: '700',
  },
});
