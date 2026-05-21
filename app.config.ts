import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  name: 'ScaleTrek',
  slug: 'scaletrek',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'scaletrek',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#050505',
  },
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    url: process.env.EXPO_UPDATES_URL ?? 'https://u.expo.dev/REPLACED_BY_EAS_INIT',
    fallbackToCacheTimeout: 0,
    checkAutomatically: 'ON_LOAD',
    enabled: true,
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.scaletrek.app',
    infoPlist: {
      NSPhotoLibraryUsageDescription: 'ScaleTrek needs photo access to attach proof images to your milestones.',
      NSCameraUsageDescription: 'ScaleTrek uses the camera so you can capture proof for your milestones.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#050505',
    },
    package: 'com.scaletrek.app',
    versionCode: 1,
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: ['CAMERA', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'POST_NOTIFICATIONS'],
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-updates',
    'expo-localization',
    'expo-secure-store',
    'expo-web-browser',
    [
      '@react-native-google-signin/google-signin',
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'ScaleTrek needs photo access to attach proof images to your milestones.',
        cameraPermission: 'ScaleTrek uses the camera so you can capture proof for your milestones.',
      },
    ],
    'expo-video',
    [
      'expo-notifications',
      { color: '#0A66C2' },
    ],
  ],
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID ?? 'REPLACED_BY_EAS_INIT' },
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_FX_API_URL: process.env.EXPO_PUBLIC_FX_API_URL,
    EXPO_PUBLIC_DEFAULT_CURRENCY: process.env.EXPO_PUBLIC_DEFAULT_CURRENCY,
    EXPO_PUBLIC_DEFAULT_LANGUAGE: process.env.EXPO_PUBLIC_DEFAULT_LANGUAGE,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  },
  owner: process.env.EXPO_OWNER ?? undefined,
});
