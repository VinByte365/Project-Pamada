import React, { useMemo } from 'react';
import { PanResponder, View } from 'react-native';

const MAIN_TAB_ROUTES = ['Home', 'History', 'Community', 'Chatbot', 'Profile'];

export default function withMainTabSwipe(ScreenComponent, routeName) {
  return function SwipeableMainTabScreen(props) {
    const navigation = props.navigation;

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onMoveShouldSetPanResponder: (_, gestureState) => {
            const horizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.35;
            return horizontal && Math.abs(gestureState.dx) > 26;
          },
          onPanResponderRelease: (_, gestureState) => {
            const currentIndex = MAIN_TAB_ROUTES.indexOf(routeName);
            if (currentIndex === -1) return;

            const isSwipeLeft = gestureState.dx < -52;
            const isSwipeRight = gestureState.dx > 52;
            if (!isSwipeLeft && !isSwipeRight) return;

            const nextIndex = isSwipeLeft ? currentIndex + 1 : currentIndex - 1;
            const nextRoute = MAIN_TAB_ROUTES[nextIndex];
            if (!nextRoute) return;

            navigation.navigate(nextRoute);
          },
        }),
      [navigation]
    );

    return (
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <ScreenComponent {...props} />
      </View>
    );
  };
}

