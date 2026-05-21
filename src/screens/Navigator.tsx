import React, { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Zap, BarChart2, MessageCircle, User, Shield, Briefcase } from 'lucide-react-native';

import { useAuthStore } from '../store/useAuthStore';
import { useNotificationsStore } from '../store/useNotificationsStore';
import { useFeedStore } from '../store/useFeedStore';
import { useChatStore } from '../store/useChatStore';
import { useDealsStore } from '../store/useDealsStore';
import { useFollowsStore } from '../store/useFollowsStore';
import { useModerationStore } from '../store/useModerationStore';
import { useTheme } from '../theme/ThemeContext';
import { Typography, elevationFor } from '../constants/theme';
import { useTranslation } from '../i18n';

import { SwipeArea } from '../components/navigation/SwipeArea';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AuthGate } from './Auth/AuthGate';
import { CompleteProfileScreen } from './Auth/CompleteProfileScreen';
import { ResetPasswordScreen } from './Auth/ResetPasswordScreen';
import { OnboardingScreen } from './OnboardingScreen';
import { FeedScreen } from './FeedScreen';
import { ShowcaseScreen } from './ShowcaseScreen';
import { InvestorScreen } from './InvestorScreen';
import { ChatScreen } from './ChatScreen';
import { ProfileScreen } from './ProfileScreen';
import { CreatePostScreen } from './CreatePostScreen';
import { EditProfileScreen } from './EditProfileScreen';
import { SearchScreen } from './SearchScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { UserProfileScreen } from './UserProfileScreen';
import { DealPipelineScreen } from './DealPipelineScreen';
import { SettingsScreen } from './SettingsScreen';
import { AdminScreen } from './AdminScreen';
import { RequestVerificationScreen } from './RequestVerificationScreen';
import { DeckSharesScreen } from './DeckSharesScreen';
import { SubscriptionScreen } from './SubscriptionScreen';
import { StoryComposerScreen } from './StoryComposerScreen';
import { StoryViewerScreen } from './StoryViewerScreen';
import { LegalScreen } from './LegalScreen';
import { PitchCoachScreen } from './PitchCoachScreen';
import { SavedPostsScreen } from './SavedPostsScreen';
import { SynergyMatchScreen } from './SynergyMatchScreen';
import { PostDetailScreen } from './PostDetailScreen';

type RootStackParamList = {
  Tabs: undefined;
  CreatePost: undefined;
  EditProfile: undefined;
  Search: undefined;
  Notifications: undefined;
  UserProfile: { userId: string };
  Pipeline: undefined;
  Settings: undefined;
  RequestVerification: undefined;
  DeckShares: { investorId?: string } | undefined;
  Subscription: undefined;
  StoryComposer: undefined;
  StoryViewer: { authorIndex: number };
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  SavedPosts: undefined;
  PitchCoach: undefined;
  SynergyMatch: undefined;
  PostDetail: { postId: string };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

const Tabs: React.FC<{
  onOpenCreate: () => void;
  onOpenEdit: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenPipeline: () => void;
  onOpenSettings: () => void;
  onOpenVerification: () => void;
  onOpenStoryComposer: () => void;
  onOpenStoryViewer: (authorIndex: number) => void;
  onOpenPost: (postId: string) => void;
  onLogout: () => void;
}> = ({
  onOpenCreate,
  onOpenEdit,
  onOpenSearch,
  onOpenNotifications,
  onOpenProfile,
  onOpenPipeline,
  onOpenSettings,
  onOpenVerification,
  onOpenStoryComposer,
  onOpenStoryViewer,
  onOpenPost,
  onLogout,
}) => {
  const { palette } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'dreamer';
  const insets = useSafeAreaInsets();
  // On phones with on-screen nav buttons (3-button nav, or gesture pill) we get
  // a non-zero bottom inset. Without padding, the tab bar sits under the nav.
  const bottomPad = Math.max(insets.bottom, 8);

  const accent =
    role === 'admin' ? palette.admin : role === 'investor' ? palette.reality : palette.dreamer;

  // Ordered tab names — drives swipe-to-adjacent-tab navigation. Must match the
  // <Tab.Screen> order below (Admin only present for admins).
  const tabOrder =
    role === 'admin'
      ? ['Feed', 'Showcase', 'Investors', 'Chat', 'Admin', 'Profile']
      : ['Feed', 'Showcase', 'Investors', 'Chat', 'Profile'];

  // Wrap a tab's content so a horizontal flick jumps to the neighbouring tab.
  const swipe = (name: string, navigation: any, content: React.ReactNode) => {
    const i = tabOrder.indexOf(name);
    const prev = i > 0 ? tabOrder[i - 1] : undefined;
    const next = i >= 0 && i < tabOrder.length - 1 ? tabOrder[i + 1] : undefined;
    return (
      <SwipeArea
        onSwipeLeft={next ? () => navigation.navigate(next) : undefined}
        onSwipeRight={prev ? () => navigation.navigate(prev) : undefined}
      >
        {content}
      </SwipeArea>
    );
  };

  const elev = elevationFor(palette, 'lg');
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopWidth: 0,
          paddingBottom: bottomPad,
          paddingTop: 8,
          height: 60 + bottomPad,
          ...elev,
        },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: palette.textDim,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: Typography.fontWeightSemiBold,
          marginTop: 2,
          letterSpacing: 0.2,
        },
        tabBarIcon: ({ color, focused }) => {
          const size = 22;
          const strokeWidth = focused ? 2.2 : 1.7;
          if (route.name === 'Feed') return <Zap size={size} color={color} strokeWidth={strokeWidth} />;
          if (route.name === 'Showcase')
            return <BarChart2 size={size} color={color} strokeWidth={strokeWidth} />;
          if (route.name === 'Investors')
            return <Briefcase size={size} color={color} strokeWidth={strokeWidth} />;
          if (route.name === 'Chat')
            return <MessageCircle size={size} color={color} strokeWidth={strokeWidth} />;
          if (route.name === 'Profile')
            return <User size={size} color={color} strokeWidth={strokeWidth} />;
          if (route.name === 'Admin')
            return <Shield size={size} color={color} strokeWidth={strokeWidth} />;
          return <View />;
        },
      })}
    >
      <Tab.Screen name="Feed" options={{ tabBarLabel: t('nav.feed') }}>
        {({ navigation }) =>
          swipe(
            'Feed',
            navigation,
            <FeedScreen
              onOpenSearch={onOpenSearch}
              onOpenNotifications={onOpenNotifications}
              onOpenProfile={onOpenProfile}
              onOpenStoryComposer={onOpenStoryComposer}
              onOpenStoryViewer={onOpenStoryViewer}
              onOpenPost={onOpenPost}
            />,
          )
        }
      </Tab.Screen>

      <Tab.Screen name="Showcase" options={{ tabBarLabel: t('nav.showcase') }}>
        {({ navigation }) =>
          swipe(
            'Showcase',
            navigation,
            <ShowcaseScreen onCreatePost={onOpenCreate} onEditProfile={onOpenEdit} />,
          )
        }
      </Tab.Screen>

      <Tab.Screen
        name="Investors"
        options={{ tabBarLabel: role === 'investor' ? t('nav.control') : t('nav.investors') }}
      >
        {({ navigation }) =>
          swipe(
            'Investors',
            navigation,
            <InvestorScreen onOpenPipeline={onOpenPipeline} onOpenProfile={onOpenProfile} />,
          )
        }
      </Tab.Screen>

      <Tab.Screen name="Chat" options={{ tabBarLabel: t('nav.chat') }}>
        {({ navigation }) => swipe('Chat', navigation, <ChatScreen />)}
      </Tab.Screen>

      {role === 'admin' && (
        <Tab.Screen name="Admin" options={{ tabBarLabel: t('nav.admin') }}>
          {({ navigation }) => swipe('Admin', navigation, <AdminScreen />)}
        </Tab.Screen>
      )}

      <Tab.Screen name="Profile" options={{ tabBarLabel: t('nav.profile') }}>
        {({ navigation }) =>
          swipe(
            'Profile',
            navigation,
            <ProfileScreen
              onLogout={onLogout}
              onOpenSettings={onOpenSettings}
              onEditProfile={onOpenEdit}
              onRequestVerification={onOpenVerification}
            />,
          )
        }
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export const Navigator: React.FC = () => {
  const { palette, mode } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const onboarded = useAuthStore((s) => s.onboarded);
  const needsPasswordReset = useAuthStore((s) => s.needsPasswordReset);
  const setNeedsPasswordReset = useAuthStore((s) => s.setNeedsPasswordReset);
  const logout = useAuthStore((s) => s.logout);
  const authHydrated = useAuthStore((s) => s._hasHydrated);
  const notifHydrated = useNotificationsStore((s) => s._hasHydrated);
  const feedHydrated = useFeedStore((s) => s._hasHydrated);
  const chatHydrated = useChatStore((s) => s._hasHydrated);
  const dealsHydrated = useDealsStore((s) => s._hasHydrated);
  const followsHydrated = useFollowsStore((s) => s._hasHydrated);
  const moderationHydrated = useModerationStore((s) => s._hasHydrated);
  const [logoutKey, setLogoutKey] = useState(0);

  const allHydrated =
    authHydrated &&
    notifHydrated &&
    feedHydrated &&
    chatHydrated &&
    dealsHydrated &&
    followsHydrated &&
    moderationHydrated;

  if (!allHydrated) return null;

  if (!isAuthenticated || !user) {
    return <AuthGate />;
  }

  if (needsPasswordReset) {
    return <ResetPasswordScreen onDone={() => setNeedsPasswordReset(false)} />;
  }

  if (user.profileComplete === false) {
    return <CompleteProfileScreen />;
  }

  if (!onboarded && user.role !== 'admin') {
    return <OnboardingScreen onFinish={() => useAuthStore.getState().setOnboarded(true)} />;
  }

  const navTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: palette.background,
      card: palette.card,
      text: palette.textPrimary,
      border: palette.border,
      primary: palette.accent,
      notification: palette.error,
    },
  };

  return (
    <NavigationContainer theme={navTheme} key={`${logoutKey}-${mode}`}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Tabs">
          {({ navigation }) => (
            <Tabs
              onOpenCreate={() => navigation.navigate('CreatePost')}
              onOpenEdit={() => navigation.navigate('EditProfile')}
              onOpenSearch={() => navigation.navigate('Search')}
              onOpenNotifications={() => navigation.navigate('Notifications')}
              onOpenPipeline={() => navigation.navigate('Pipeline')}
              onOpenSettings={() => navigation.navigate('Settings')}
              onOpenVerification={() => navigation.navigate('RequestVerification')}
              onOpenProfile={(userId) => navigation.navigate('UserProfile', { userId })}
              onOpenStoryComposer={() => navigation.navigate('StoryComposer')}
              onOpenStoryViewer={(authorIndex) => navigation.navigate('StoryViewer', { authorIndex })}
              onOpenPost={(postId) => navigation.navigate('PostDetail', { postId })}
              onLogout={() => {
                logout();
                setLogoutKey((k) => k + 1);
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="CreatePost" options={{ animation: 'slide_from_bottom' }}>
          {({ navigation }) => <CreatePostScreen onClose={() => navigation.goBack()} />}
        </Stack.Screen>

        <Stack.Screen name="EditProfile" options={{ animation: 'slide_from_bottom' }}>
          {({ navigation }) => <EditProfileScreen onClose={() => navigation.goBack()} />}
        </Stack.Screen>

        <Stack.Screen name="Search">
          {({ navigation }) => (
            <SearchScreen
              onClose={() => navigation.goBack()}
              onOpenProfile={(userId) => navigation.navigate('UserProfile', { userId })}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Notifications">
          {({ navigation }) => <NotificationsScreen onClose={() => navigation.goBack()} />}
        </Stack.Screen>

        <Stack.Screen name="UserProfile">
          {({ navigation, route }) => (
            <UserProfileScreen
              userId={(route.params as any).userId}
              onClose={() => navigation.goBack()}
              onOpenChat={() => navigation.navigate('Tabs' as never)}
              onShareDeck={(investorId) =>
                navigation.navigate('DeckShares', { investorId })
              }
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Pipeline">
          {({ navigation }) => (
            <DealPipelineScreen
              onClose={() => navigation.goBack()}
              onOpenProfile={(userId) => navigation.navigate('UserProfile', { userId })}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Settings" options={{ animation: 'slide_from_bottom' }}>
          {({ navigation }) => (
            <SettingsScreen
              onClose={() => navigation.goBack()}
              onLogout={() => {
                logout();
                setLogoutKey((k) => k + 1);
              }}
              onOpenSubscription={() => navigation.navigate('Subscription')}
              onOpenPrivacy={() => navigation.navigate('PrivacyPolicy')}
              onOpenTerms={() => navigation.navigate('TermsOfService')}
              onOpenSaved={() => navigation.navigate('SavedPosts')}
              onOpenPitchCoach={() => navigation.navigate('PitchCoach')}
              onOpenSynergy={() => navigation.navigate('SynergyMatch')}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="RequestVerification" options={{ animation: 'slide_from_bottom' }}>
          {({ navigation }) => <RequestVerificationScreen onClose={() => navigation.goBack()} />}
        </Stack.Screen>

        <Stack.Screen name="DeckShares" options={{ animation: 'slide_from_bottom' }}>
          {({ navigation, route }) => (
            <DeckSharesScreen
              onClose={() => navigation.goBack()}
              shareWithInvestorId={(route.params as any)?.investorId}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Subscription" options={{ animation: 'slide_from_bottom' }}>
          {({ navigation }) => <SubscriptionScreen onClose={() => navigation.goBack()} />}
        </Stack.Screen>

        <Stack.Screen
          name="StoryComposer"
          options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
        >
          {({ navigation }) => (
            <ErrorBoundary onClose={() => navigation.goBack()} label="The camera couldn't be opened.">
              <StoryComposerScreen onClose={() => navigation.goBack()} />
            </ErrorBoundary>
          )}
        </Stack.Screen>

        <Stack.Screen
          name="StoryViewer"
          options={{ animation: 'fade', presentation: 'fullScreenModal' }}
        >
          {({ navigation, route }) => (
            <ErrorBoundary onClose={() => navigation.goBack()} label="This story couldn't be shown.">
              <StoryViewerScreen
                initialAuthorIndex={(route.params as any)?.authorIndex ?? 0}
                onClose={() => navigation.goBack()}
              />
            </ErrorBoundary>
          )}
        </Stack.Screen>

        <Stack.Screen name="PrivacyPolicy" options={{ animation: 'slide_from_bottom' }}>
          {({ navigation }) => <LegalScreen kind="privacy" onClose={() => navigation.goBack()} />}
        </Stack.Screen>

        <Stack.Screen name="TermsOfService" options={{ animation: 'slide_from_bottom' }}>
          {({ navigation }) => <LegalScreen kind="terms" onClose={() => navigation.goBack()} />}
        </Stack.Screen>

        <Stack.Screen name="PitchCoach" options={{ animation: 'slide_from_bottom' }}>
          {({ navigation }) => (
            <PitchCoachScreen
              onClose={() => navigation.goBack()}
              onUpgrade={() => navigation.navigate('Subscription')}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="SynergyMatch" options={{ animation: 'slide_from_right' }}>
          {({ navigation }) => (
            <SynergyMatchScreen
              onClose={() => navigation.goBack()}
              onEditProfile={() => navigation.navigate('EditProfile')}
              onOpenProfile={(userId) => navigation.navigate('UserProfile', { userId })}
              onOpenChat={() => navigation.navigate('Tabs' as never)}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="PostDetail" options={{ animation: 'slide_from_right' }}>
          {({ navigation, route }) => (
            <PostDetailScreen
              postId={(route.params as any).postId}
              onClose={() => navigation.goBack()}
              onOpenProfile={(userId) => navigation.navigate('UserProfile', { userId })}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="SavedPosts" options={{ animation: 'slide_from_right' }}>
          {({ navigation }) => (
            <SavedPostsScreen
              onClose={() => navigation.goBack()}
              onUpgrade={() => navigation.navigate('Subscription')}
              onOpenProfile={(userId) => navigation.navigate('UserProfile', { userId })}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};
