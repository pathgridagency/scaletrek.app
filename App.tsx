import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeContext';
import { Navigator } from './src/screens/Navigator';
import { useMomentumScheduler } from './src/lib/momentum';
import { useCryptoBootstrap } from './src/lib/crypto';
import { useSupabaseSync } from './src/lib/sync';
import { useOAuthDeepLink } from './src/lib/useOAuthDeepLink';
import { usePushRegistration } from './src/lib/push';

const BackgroundRunners: React.FC = () => {
  useSupabaseSync();
  useCryptoBootstrap();
  useMomentumScheduler();
  useOAuthDeepLink();
  usePushRegistration();
  return null;
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <BackgroundRunners />
          <Navigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
