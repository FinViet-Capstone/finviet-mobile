import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { DevicePushToken, NotificationResponse } from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { InAppNotificationBanner } from '@/components/common/InAppNotificationBanner';
import { useUnreadNotifications } from '@/hooks/useNotifications';
import {
  collectNewUnreadNotifications,
  type NotificationArrivalState,
} from '@/lib/notificationArrivals';
import { insertNotificationInCache, markNotificationReadInCache } from '@/lib/notificationCache';
import {
  csvImportReadyRoute,
  notificationDetailRoute,
  notificationRoute,
  parseNotificationPushData,
} from '@/lib/notificationRouting';
import { getNotificationInstallationId } from '@/lib/notificationStorage';
import {
  getExpoNotificationToken,
  loadNativeNotifications,
  notificationPlatform,
  setupNotifications,
} from '@/lib/notifications';
import { queryKeys } from '@/lib/queryKeys';
import {
  markNotificationRead,
  registerNotificationDevice,
} from '@/services';
import { useAuthStore } from '@/stores/authStore';
import type { AppNotification } from '@/types/notification';

const FOREGROUND_POLL_MS = 30_000;

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hydrated = useAuthStore((state) => state.hydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const customerId = useAuthStore((state) => state.customer?.id ?? null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [queue, setQueue] = useState<AppNotification[]>([]);
  const arrivalStateRef = useRef<NotificationArrivalState>({
    isSeeded: false,
    seenIds: new Set<string>(),
  });
  const pendingResponseRef = useRef<NotificationResponse | null>(null);
  const previousCustomerIdRef = useRef<string | null>(null);
  const isForeground = appState === 'active';
  const {
    data: unread = [],
    isFetched: hasFetchedUnread,
    refetch: refetchUnread,
  } = useUnreadNotifications({
    refetchInterval: isAuthenticated && isForeground ? FOREGROUND_POLL_MS : false,
  });
  const currentNotification = queue[0] ?? null;

  const dismissCurrent = useCallback(() => {
    setQueue((current) => current.slice(1));
  }, []);

  const enqueue = useCallback((notification: AppNotification) => {
    if (arrivalStateRef.current.seenIds.has(notification.id)) return;
    arrivalStateRef.current.seenIds.add(notification.id);
    setQueue((current) => [...current, notification]);
  }, []);

  const markReadBestEffort = useCallback((notificationId: string) => {
    if (customerId) markNotificationReadInCache(queryClient, customerId, notificationId);
    markNotificationRead(notificationId).catch(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    });
  }, [customerId, queryClient]);

  const handleBannerPress = useCallback((notification: AppNotification) => {
    markReadBestEffort(notification.id);
    dismissCurrent();
    router.push(notificationRoute(notification));
  }, [dismissCurrent, markReadBestEffort, router]);

  const handleNotificationResponse = useCallback((
    response: NotificationResponse,
  ) => {
    if (!isAuthenticated) {
      pendingResponseRef.current = response;
      return;
    }

    const csvRoute = csvImportReadyRoute(
      response.notification.request.content.data ?? {},
    );
    if (csvRoute) {
      router.push(csvRoute);
      return;
    }

    const pushData = parseNotificationPushData(
      response.notification.request.content.data ?? {},
    );
    if (!pushData) {
      router.push('/notifications');
      return;
    }

    markReadBestEffort(pushData.notificationId);
    router.push(notificationDetailRoute({
      id: pushData.notificationId,
      title: response.notification.request.content.title ?? null,
      body: response.notification.request.content.body ?? null,
    }));
  }, [isAuthenticated, markReadBestEffort, router]);

  useEffect(() => {
    if (previousCustomerIdRef.current === customerId) return;

    const previousCustomerId = previousCustomerIdRef.current;
    previousCustomerIdRef.current = customerId;
    arrivalStateRef.current = {
      isSeeded: false,
      seenIds: new Set<string>(),
    };
    if (previousCustomerId !== null) pendingResponseRef.current = null;
    setQueue([]);
    queryClient.removeQueries({ queryKey: queryKeys.notifications.all() });
  }, [customerId, queryClient]);

  useEffect(() => {
    if (!isAuthenticated || !hasFetchedUnread) return;

    const arrivals = collectNewUnreadNotifications(arrivalStateRef.current, unread);
    if (arrivals.length > 0) {
      setQueue((current) => [...current, ...arrivals]);
    }
  }, [hasFetchedUnread, isAuthenticated, unread]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppState(nextState);
      if (nextState === 'active' && isAuthenticated) {
        refetchUnread();
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      }
    });
    return () => subscription.remove();
  }, [isAuthenticated, queryClient, refetchUnread]);

  useEffect(() => {
    // Expo Go can still display local notifications, but Android remote-push
    // registration was removed in SDK 53. In SDK 57, merely subscribing to
    // push-token changes throws and prevents the whole app from rendering.
    // Keep server polling and FinViet's in-app banner active while skipping
    // the native notification module that requires a development build.
    if (
      !hydrated
      || !isAuthenticated
      || !customerId
      || !notificationPlatform()
    ) return;

    let isCancelled = false;
    let tokenSubscription: { remove: () => void } | null = null;

    const register = async (devicePushToken?: DevicePushToken) => {
      try {
        const platform = notificationPlatform();
        if (!platform || !(await setupNotifications())) return;

        const [token, installationId] = await Promise.all([
          getExpoNotificationToken(devicePushToken),
          getNotificationInstallationId(),
        ]);
        if (isCancelled) return;
        await registerNotificationDevice({ token, platform, installationId });
      } catch (error) {
        console.warn('[Notifications] Device registration failed', error);
      }
    };

    void (async () => {
      const Notifications = await loadNativeNotifications();
      if (!Notifications || isCancelled) return;

      await register();
      if (isCancelled) return;
      tokenSubscription = Notifications.addPushTokenListener((deviceToken) => {
        register(deviceToken);
      });
    })();

    return () => {
      isCancelled = true;
      tokenSubscription?.remove();
    };
  }, [customerId, hydrated, isAuthenticated]);

  useEffect(() => {
    let isCancelled = false;
    let receiveSubscription: { remove: () => void } | null = null;
    let responseSubscription: { remove: () => void } | null = null;

    void (async () => {
      const Notifications = await loadNativeNotifications();
      if (!Notifications || isCancelled) return;

      receiveSubscription = Notifications.addNotificationReceivedListener((event) => {
        const session = useAuthStore.getState();
        const activeCustomerId = session.customer?.id ?? null;
        if (!session.isAuthenticated || !activeCustomerId) return;

        const content = event.request.content;
        if (csvImportReadyRoute(content.data ?? {})) return;

        const pushData = parseNotificationPushData(content.data ?? {});
        if (!pushData) {
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
          return;
        }

        const notification: AppNotification = {
          id: pushData.notificationId,
          customerId: activeCustomerId,
          type: pushData.type,
          title: content.title,
          body: content.body,
          entityType: pushData.entityType,
          entityId: pushData.entityId,
          isRead: false,
          sentAt: new Date().toISOString(),
        };
        insertNotificationInCache(queryClient, activeCustomerId, notification);
        if (AppState.currentState === 'active') enqueue(notification);
      });
      responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        pendingResponseRef.current = response;
        const session = useAuthStore.getState();
        if (!session.hydrated || !session.isAuthenticated) return;
        handleNotificationResponse(response);
        pendingResponseRef.current = null;
      });

      const initialResponse = Notifications.getLastNotificationResponse();
      if (!initialResponse) return;

      pendingResponseRef.current = initialResponse;
      Notifications.clearLastNotificationResponse();
      const session = useAuthStore.getState();
      if (session.hydrated && session.isAuthenticated) {
        handleNotificationResponse(initialResponse);
        pendingResponseRef.current = null;
      }
    })();

    return () => {
      isCancelled = true;
      receiveSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [enqueue, handleNotificationResponse, queryClient]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !pendingResponseRef.current) return;

    const response = pendingResponseRef.current;
    pendingResponseRef.current = null;
    handleNotificationResponse(response);
  }, [handleNotificationResponse, hydrated, isAuthenticated]);

  return (
    <>
      {children}
      <InAppNotificationBanner
        notification={currentNotification}
        onDismiss={dismissCurrent}
        onPress={handleBannerPress}
      />
    </>
  );
}
