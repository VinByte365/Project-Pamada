import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CommunityScreen from '../screens/CommunityScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import BottomNavBar, {
  BOTTOM_NAV_BAR_HEIGHT,
  BOTTOM_NAV_FLOAT_MARGIN,
} from '../components/navigation/BottomNavBar';
import withMainTabSwipe from './withMainTabSwipe';
import { spacing } from '../theme';

const Tab = createBottomTabNavigator();
const SwipeHomeScreen = withMainTabSwipe(HomeScreen, 'Home');
const SwipeHistoryScreen = withMainTabSwipe(HistoryScreen, 'History');
const SwipeCommunityScreen = withMainTabSwipe(CommunityScreen, 'Community');
const SwipeChatbotScreen = withMainTabSwipe(ChatbotScreen, 'Chatbot');
const SwipeProfileScreen = withMainTabSwipe(ProfileScreen, 'Profile');

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const sceneBottomInset =
    BOTTOM_NAV_BAR_HEIGHT + insets.bottom + BOTTOM_NAV_FLOAT_MARGIN + spacing.md;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: { paddingBottom: sceneBottomInset },
        animation: 'fade',
      }}
      tabBar={(props) => <BottomNavBar {...props} />}
    >
      <Tab.Screen name="Home" component={SwipeHomeScreen} />
      <Tab.Screen name="History" component={SwipeHistoryScreen} />
      <Tab.Screen name="Community" component={SwipeCommunityScreen} />
      <Tab.Screen name="Chatbot" component={SwipeChatbotScreen} />
      <Tab.Screen name="Profile" component={SwipeProfileScreen} />
    </Tab.Navigator>
  );
}
