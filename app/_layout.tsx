import { Stack } from 'expo-router';
import { useEffect } from 'react';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SKI_GAME_COLORS } from '@/src/components/ski-game/utils/colors';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: {
            flex: 1,
            backgroundColor: SKI_GAME_COLORS.snow,
          },
        }}
      />
    </SafeAreaProvider>
  );
}
