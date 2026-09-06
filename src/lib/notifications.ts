import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import type { DevicePushToken } from 'expo-notifications';
import { Platform } from 'react-native';
import { CSV_IMPORT_READY_KIND, type CsvImportReadyData } from '@/lib/notificationRouting';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

/**
 * The SDK 57 expo-notifications entry point registers a remote-push listener
 * while the module is evaluated. Android Expo Go rejects that listener before
 * application code can catch it, so never evaluate the module in Expo Go.
 */
export function loadNativeNotifications(): Promise<NotificationsModule | null> {
  if (isRunningInExpoGo()) return Promise.resolve(null);

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then((Notifications) => {
        // The handler runs only while the app is foregrounded. The global
        // FinViet banner owns that experience, avoiding a duplicate OS banner.
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: false,
            shouldShowList: false,
          }),
        });
        return Notifications;
      })
      .catch((error) => {
        console.warn('[Notifications] Native module unavailable', error);
        return null;
      });
  }

  return notificationsModulePromise;
}

export async function setupNotifications(): Promise<boolean> {
  const Notifications = await loadNativeNotifications();
  if (!Notifications) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Thông báo FinViet',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A6B3C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getExpoNotificationToken(
  devicePushToken?: DevicePushToken,
): Promise<string> {
  const Notifications = await loadNativeNotifications();
  if (!Notifications) {
    throw new Error('Native push notifications are unavailable in Expo Go.');
  }

  const projectId = Constants.easConfig?.projectId
    ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error('Missing EAS project ID for push notifications.');

  const token = await Notifications.getExpoPushTokenAsync({
    projectId,
    ...(devicePushToken ? { devicePushToken } : {}),
  });
  return token.data;
}

export function notificationPlatform(): 'ios' | 'android' | null {
  if (isRunningInExpoGo()) return null;
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  return null;
}

/** Fires an immediate local OS notification — used when CSV categorization finishes while
 * the app is backgrounded, so there's no server round trip or AppNotification row involved. */
export async function scheduleCsvImportReadyNotification(params: {
  title: string;
  body: string;
  fileUri: string;
  fileName: string;
}): Promise<void> {
  const Notifications = await loadNativeNotifications();
  if (!Notifications) return;

  const data: CsvImportReadyData = {
    localKind: CSV_IMPORT_READY_KIND,
    fileUri: params.fileUri,
    fileName: params.fileName,
  };
  await Notifications.scheduleNotificationAsync({
    content: { title: params.title, body: params.body, data },
    trigger: null,
  });
}
