import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, shadows, spacing, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

const icons = {
  Home: 'home-outline',
  Chatbot: 'chatbubbles-outline',
  History: 'grid-outline',
  Community: 'people-outline',
  Profile: 'person-outline',
};

export default function BottomNavBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useAppTheme();
  const [barWidth, setBarWidth] = useState(0);
  const selectionAnim = useRef(new Animated.Value(state.index)).current;
  const pressAnimMap = useRef({});

  useEffect(() => {
    Animated.spring(selectionAnim, {
      toValue: state.index,
      stiffness: 220,
      damping: 26,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [selectionAnim, state.index]);

  const itemWidth = useMemo(() => {
    if (!barWidth || state.routes.length === 0) return 0;
    return (barWidth - spacing.sm * 2) / state.routes.length;
  }, [barWidth, state.routes.length]);

  const ensurePressAnim = (routeKey) => {
    if (!pressAnimMap.current[routeKey]) {
      pressAnimMap.current[routeKey] = new Animated.Value(0);
    }
    return pressAnimMap.current[routeKey];
  };

  const runPressHighlight = (routeKey) => {
    const anim = ensurePressAnim(routeKey);
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: 130,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: 260,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, spacing.sm) }]}>
      <LinearGradient
        colors={isDark ? ['rgba(22,33,29,0.95)', 'rgba(28,42,36,0.9)'] : ['rgba(255,255,255,0.92)', 'rgba(236,247,243,0.88)']}
        style={[styles.bar, { borderColor: palette.surface.borderStrong }]}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      >
        {itemWidth > 0 ? (
          <Animated.View
            style={[
              styles.indicator,
              {
                width: itemWidth - spacing.xs,
                backgroundColor: `${palette.primary.solid}33`,
                transform: [
                  {
                    translateX: selectionAnim.interpolate({
                      inputRange: [0, Math.max(state.routes.length - 1, 1)],
                      outputRange: [spacing.sm + spacing.xxs / 2, spacing.sm + (state.routes.length - 1) * itemWidth + spacing.xxs / 2],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const pressAnim = ensurePressAnim(route.key);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            runPressHighlight(route.key);

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
              <Animated.View
                style={[
                  styles.pressFlash,
                  {
                    opacity: pressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.22],
                    }),
                    transform: [
                      {
                        scale: pressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1.1],
                        }),
                      },
                    ],
                  },
                ]}
              />
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
    left: spacing.screenPadding,
    right: spacing.screenPadding,
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  bar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.floating,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    ...shadows.floating,
  },
  indicator: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    borderRadius: 16,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  pressFlash: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -22,
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#A5C4AF',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    marginTop: 2,
    fontSize: 11,
  },
});
