import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications appear when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and return the Expo push token.
 * Returns null if the user declines or device doesn't support it.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulator — can still get a token for local notifications
    console.log('Running on simulator — push notifications may not work end-to-end');
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('affirmations', {
      name: 'Daily Affirmations',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B7CF6',
      sound: null,
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch (e) {
    console.log('Could not get push token:', e);
    // Return a placeholder — local notifications still work
    return 'local-only';
  }
}

/**
 * Save the push token and preferences to Supabase.
 * Skips saving on web since push tokens aren't available there.
 */
export async function savePushToken(
  token: string,
  notificationTime: string = '08:00',
  frequency: string = 'daily'
): Promise<void> {
  if (Platform.OS === 'web') return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('notification_preferences').upsert(
    {
      user_id: user.id,        // required for RLS policy
      expo_push_token: token,
      notification_time: notificationTime,
      frequency,
      enabled: true,
    },
    { onConflict: 'user_id' }
  );
}

/**
 * Schedule a daily local notification at the user's preferred time.
 * Cancels any existing scheduled notifications first.
 */
export async function scheduleDailyNotification(
  affirmationText: string,
  notificationTime: string = '08:00'
): Promise<void> {
  if (Platform.OS === 'web') return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const [hourStr, minuteStr] = notificationTime.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (isNaN(hour) || isNaN(minute)) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✨ Your Daily Affirmation',
      body: affirmationText,
      data: { screen: 'DailyAffirmation' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Send an immediate local notification (useful for testing).
 */
export async function sendTestNotification(affirmationText: string): Promise<void> {
  if (Platform.OS === 'web') {
    alert('Notifications are only available on mobile devices, not in the browser.');
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✨ Your Daily Affirmation',
      body: affirmationText,
      data: { screen: 'DailyAffirmation' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
    },
  });
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
