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

          {typeof item.taskProgress === 'number' && item.status !== 'ready' && item.status !== 'harvested' ? (
            <View style={styles.progressRow}>
              <View style={[styles.progressTrack, { backgroundColor: palette.surface.soft }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(0, Math.min(100, item.taskProgress))}%`,
                      backgroundColor: palette.primary.solid,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: palette.text.secondary }]}>
                {Math.round(item.taskProgress)}%
              </Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <StatusBadge status={item.status} />
            <View style={[styles.urgencyDot, { backgroundColor: item.urgencyColor }]} />
            <Text numberOfLines={1} style={[styles.urgencyText, { color: palette.text.secondary }]}>
              {item.urgency}
            </Text>
          </View>
        </View>
      </View>
    </ElevatedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.sm,
    height: 126,
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
    flexWrap: 'nowrap',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    flex: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressText: {
    ...typography.caption,
    width: 40,
    textAlign: 'right',
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
    flexShrink: 1,
  },
});
