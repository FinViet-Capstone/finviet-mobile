import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CSV_IMPORT_READY_KIND, type CsvImportReadyData } from '@/lib/notificationRouting';

// The handler runs only while the app is foregrounded. The global FinViet banner
// owns that experience, avoiding a duplicate OS banner for the same push.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

export async function setupNotifications(): Promise<boolean> {
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
  devicePushToken?: Notifications.DevicePushToken,
): Promise<string> {
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
