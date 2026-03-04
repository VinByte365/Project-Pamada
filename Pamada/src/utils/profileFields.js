export const PROFILE_SETTINGS_FIELDS = [
  { icon: 'person-circle-outline', label: 'Account Settings', route: 'AccountSettings' },
  { icon: 'notifications-outline', label: 'Notifications', route: 'NotificationsSettings' },
  { icon: 'shield-checkmark-outline', label: 'Privacy & Security', route: 'PrivacySecurity' },
  { icon: 'flag-outline', label: 'Report Issue', route: 'ReportIssue' },
  { icon: 'help-circle-outline', label: 'Help & Support', route: 'HelpSupport' },
  { icon: 'information-circle-outline', label: 'About Pamada', route: 'AboutPamada' },
];

export function buildProfileSummaryFields(farmInfo, analytics) {
  return [
    { icon: 'resize-outline', label: 'Farm Size', value: farmInfo.size },
    { icon: 'leaf-outline', label: 'Total Plants', value: `${farmInfo.plants}` },
    { icon: 'calendar-outline', label: 'Member Since', value: farmInfo.joined },
    { icon: 'analytics-outline', label: 'AI Accuracy', value: analytics.avgMaturity || '0%', accent: true },
  ];
}
