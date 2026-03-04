import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAppTheme from '../../theme/useAppTheme';
import { spacing, typography, radius } from '../../theme';

/**
 * TabBar Component
 * Modern tab navigation with animated indicator
 */
export default function TabBar({
  tabs,
  activeTab,
  onTabChange,
  style,
  variant = 'underline', // 'underline' or 'filled'
}) {
  const { palette } = useAppTheme();

  if (variant === 'filled') {
    return (
      <View style={[styles.containerFilled, { backgroundColor: palette.surface.soft }, style]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.innerFilled}
        >
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => onTabChange(tab.id)}
                style={[
                  styles.tabFilled,
                  isActive && {
                    backgroundColor: palette.primary.start,
                  },
                ]}
                >
                <Text
                  style={[
                    styles.tabTextFilled,
                    {
                      color: isActive ? palette.primary.on : palette.text.primary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // Underline variant (default)
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={[styles.tab]}
          >
            {tab.icon && (
              <View style={styles.tabIcon}>
                {typeof tab.icon === 'string' ? (
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={isActive ? palette.primary.start : palette.text.secondary}
                  />
                ) : (
                  tab.icon
                )}
              </View>
            )}
            <Text
              style={[
                styles.tabText,
                {
                  color: isActive ? palette.primary.start : palette.text.secondary,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {isActive && (
              <View
                style={[
                  styles.indicator,
                  { backgroundColor: palette.primary.start },
                ]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    gap: spacing.sm,
    alignItems: 'center',
  },
  tab: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  tabIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    ...typography.bodyMedium,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: radius.xs,
    borderTopRightRadius: radius.xs,
  },
  containerFilled: {
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
  },
  innerFilled: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  tabFilled: {
    flexShrink: 0,
    minWidth: 110,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTextFilled: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
});
