import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import ChatbotScreen from '../screens/ChatbotScreen';
import ScanScreen from '../screens/ScanScreen';
import CaptureImageScanScreen from '../screens/CaptureImageScanScreen';
import LiveImagingScreen from '../screens/LiveImagingScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PrivacySecurityScreen from '../screens/PrivacySecurityScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import ReportIssueScreen from '../screens/ReportIssueScreen';
import AboutPamadaScreen from '../screens/AboutPamadaScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ConversationScreen from '../screens/ConversationScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import CreateCommunityPostScreen from '../screens/CreateCommunityPostScreen';
import DiseaseNurseryScreen from '../screens/DiseaseNurseryScreen';
import HarvestGuideScreen from '../screens/HarvestGuideScreen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const { initializing, isAuthenticated } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Scan" component={ScanScreen} />
          <Stack.Screen name="CaptureImageScan" component={CaptureImageScanScreen} />
          <Stack.Screen name="LiveImaging" component={LiveImagingScreen} />
          <Stack.Screen name="Chatbot" component={ChatbotScreen} />
          <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
          <Stack.Screen name="NotificationsSettings" component={NotificationsScreen} />
          <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="ReportIssue" component={ReportIssueScreen} />
          <Stack.Screen name="AboutPamada" component={AboutPamadaScreen} />
          <Stack.Screen name="Messages" component={MessagesScreen} />
          <Stack.Screen name="Conversation" component={ConversationScreen} />
          <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
          <Stack.Screen name="CreateCommunityPost" component={CreateCommunityPostScreen} />
          <Stack.Screen name="DiseaseNursery" component={DiseaseNurseryScreen} />
          <Stack.Screen name="HarvestGuide" component={HarvestGuideScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
