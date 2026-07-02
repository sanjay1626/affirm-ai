import 'react-native-url-polyfill/auto';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { NavigationContainerRef } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { loadVoicePreference } from './src/utils/speech';

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Load the saved voice preference so it applies to the first spoken affirmation.
  useEffect(() => { loadVoicePreference(); }, []);

  // Handle notification taps (deep-link to the right screen)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      // Notification taps always deep-link to the Home tab (Today affirmation)
      if (navigationRef.current?.isReady()) {
        try {
          navigationRef.current.navigate('Main', { screen: 'HomeTab' });
        } catch {
          // Navigation not ready — user will land on home after launch
        }
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
