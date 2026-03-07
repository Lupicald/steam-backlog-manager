import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { useDatabase } from '../src/hooks/useDatabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready } = useDatabase();

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a14' },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="game/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}
