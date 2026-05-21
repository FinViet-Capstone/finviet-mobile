import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configures foreground notification display.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

// Requests OS permission and creates Android channels.
// FCM token registration is deferred to the data layer iteration.
export async function setupNotifications(): Promise<void> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'FinViet Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A6B3C',
    });

    await Notifications.setNotificationChannelAsync('budget-alerts', {
      name: 'Cảnh báo ngân sách',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#EF4444',
    });
  }
}

// Maps notification deep-link strings to React Navigation screen names.
export interface DeepLinkDestination {
  screen: string;
  params?: Record<string, string>;
}

export function parseDeepLink(deepLink: string): DeepLinkDestination | null {
  if (!deepLink) return null;

  // Budget detail lives at /more/budget/{id} in Expo Router
  const budgetMatch = deepLink.match(/^\/more\/budget\/([a-zA-Z0-9_-]+)$/);
  if (budgetMatch) return { screen: 'BudgetDetail', params: { id: budgetMatch[1] } };

  if (deepLink === '/report/weekly') return { screen: 'WeeklyReport' };
  if (deepLink === '/report/score')  return { screen: 'SpendingScoreDetail' };

  // Goal detail lives at /wallet/goals/{id} in Expo Router
  const goalMatch = deepLink.match(/^\/wallet\/goals\/([a-zA-Z0-9_-]+)$/);
  if (goalMatch) return { screen: 'GoalDetail', params: { id: goalMatch[1] } };

  if (deepLink === '/notifications') return { screen: 'Notifications' };

  return null;
}
