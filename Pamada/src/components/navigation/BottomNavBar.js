import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

const icons = {
  Home: 'home-outline',
  Chatbot: 'chatbubbles-outline',
  History: 'grid-outline',
  Community: 'people-outline',
  Profile: 'person-outline',
};

export const BOTTOM_NAV_BAR_HEIGHT = 64;
export const BOTTOM_NAV_FLOAT_MARGIN = 12;

export default function BottomNavBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useAppTheme();
  const bottomOffset = insets.bottom + BOTTOM_NAV_FLOAT_MARGIN;

  return (
    <View style={[styles.container, { left: spacing.sm, right: spacing.sm, bottom: bottomOffset }]}>
      <LinearGradient
        colors={
          isDark
            ? ['rgba(22,33,29,0.95)', 'rgba(28,42,36,0.9)']
            : ['rgba(255,255,255,0.96)', 'rgba(240,250,244,0.92)']
        }
        style={[styles.bar, { borderColor: palette.surface.borderStrong }]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || route.name}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={styles.item}
            >
              <View
                style={[
                  styles.iconWrap,
                  isFocused
                    ? { backgroundColor: `${palette.primary.solid}22` }
                    : { backgroundColor: 'transparent' },
                ]}
              >
                <Ionicons
                  name={icons[route.name]}
                  size={18}
                  color={isFocused ? palette.primary.solid : palette.text.tertiary}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: isFocused ? palette.primary.solid : palette.text.tertiary,
                    fontWeight: isFocused ? '800' : '600',
                  },
                ]}
              >
                {route.name === 'History' ? 'Library' : route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: BOTTOM_NAV_BAR_HEIGHT,
    elevation: 8,
    shadowColor: '#274935',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  item: {
    flex: 1,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    marginTop: 1,
    fontSize: 11,
  },
});
