import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';
import { useAuthStore } from '../store/useAuthStore';

// expo-device may not be installed yet; fall back gracefully.
const isPhysicalDevice = (): boolean => {
  try {
    return Device.isDevice === true;
  } catch {
    return Platform.OS !== 'web';
  }
};

// Configure default behavior: show push as alert + sound while app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const registerForPush = async (): Promise<string | null> => {
  if (!isPhysicalDevice()) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0A66C2',
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data ?? null;
  } catch (err) {
    console.warn('[push] getExpoPushTokenAsync failed:', err);
    return null;
  }
};

// Persist the token on the user's profile so the Edge Function can look it up
// and send pushes to that recipient.
const writeToken = async (userId: string, token: string): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);
  if (error) console.warn('[push] persist token failed:', error.message);
};

export const usePushRegistration = () => {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    registerForPush().then((token) => {
      if (!cancelled && token) writeToken(userId, token);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);
};

// Helper to invoke the server-side push dispatcher.
export const sendPushTo = async (
  recipientId: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> => {
  try {
    await supabase.functions.invoke('send-push', {
      body: { recipientId, body, data },
    });
  } catch (err) {
    console.warn('[push] dispatch failed:', err);
  }
};
