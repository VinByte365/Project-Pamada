import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import ElevatedCard from './ElevatedCard';
import StatusBadge from './StatusBadge';
import { radius, spacing, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

export default function PlantPreviewTile({ item, onPress }) {
  const { palette } = useAppTheme();
  const imageSource = item.image
    ? { uri: item.image }
    : { uri: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=700&q=80' };

  return (
    <ElevatedCard onPress={onPress} style={styles.card}>
      <View style={styles.mainRow}>
        <View style={[styles.imageMask, { backgroundColor: palette.surface.soft }]}>
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        </View>
        <View style={styles.content}>
          <Text numberOfLines={1} style={[styles.name, { color: palette.text.primary }]}>
            {item.plantName}
          </Text>
          <Text style={[styles.meta, { color: palette.text.secondary }]}>{item.date}</Text>

          <View style={styles.row}>
            <StatusBadge status={item.status} />
            <View style={[styles.urgencyDot, { backgroundColor: item.urgencyColor }]} />
            <Text style={[styles.urgencyText, { color: palette.text.secondary }]}>{item.urgency}</Text>
          </View>
        </View>
      </View>
    </ElevatedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.sm,
    minHeight: 126,
    marginBottom: spacing.sm,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  imageMask: {
    borderRadius: radius.md,
    overflow: 'hidden',
    width: 112,
    height: 96,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...typography.bodyBold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  meta: {
    ...typography.caption,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  urgencyText: {
    ...typography.caption,
  },
});
