import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import type { AppNotification, NotificationType } from '@/types/notification';

const TYPE_ICON: Record<NotificationType, string> = {
  budget_alert: '⚠️',
  weekly_report: '📰',
  goal_milestone: '🎯',
  announcement: '📣',
};

const TYPE_LABEL: Record<NotificationType, string> = {
  budget_alert: 'Cảnh báo ngân sách',
  weekly_report: 'Báo cáo tuần',
  goal_milestone: 'Mục tiêu tiết kiệm',
  announcement: 'Thông báo',
};

const TYPE_COLOR: Record<NotificationType, string> = {
  budget_alert: COLORS.danger,
  weekly_report: COLORS.info,
  goal_milestone: COLORS.success,
  announcement: COLORS.brand[500],
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, '0')}/${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (isLoading) return <LoadingSpinner />;

  const list = notifications ?? [];
  const unreadCount = list.filter((n) => !n.isRead).length;

  const handleTap = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.deepLink) {
      router.push(n.deepLink as never);
    } else {
      Alert.alert(n.title ?? 'Thông báo', n.body ?? '');
    }
  };

  const handleMarkAllRead = () => {
    Alert.alert(
      'Đánh dấu đã đọc',
      'Đánh dấu tất cả thông báo là đã đọc?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () =>
            markAllRead.mutate(undefined, {
              onSuccess: ({ count }) =>
                Alert.alert('Đã cập nhật', `${count} thông báo đã được đánh dấu là đã đọc.`),
            }),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Thông báo</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0
              ? `${unreadCount} chưa đọc`
              : 'Tất cả đã đọc'}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleMarkAllRead}
            activeOpacity={0.75}
          >
            <Text style={styles.headerAction}>Đọc</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <EmptyState
            iconName="notifications-outline"
            title="Không có thông báo"
            subtitle="Cảnh báo ngân sách và báo cáo tuần sẽ xuất hiện tại đây."
          />
        ) : (
          list.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[styles.row, !n.isRead && styles.rowUnread]}
              onPress={() => handleTap(n)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: TYPE_COLOR[n.type] + '1A' },
                ]}
              >
                <Text style={styles.iconText}>{TYPE_ICON[n.type]}</Text>
              </View>
              <View style={styles.body}>
                <View style={styles.bodyTop}>
                  <Text
                    style={[styles.title, !n.isRead && styles.titleUnread]}
                    numberOfLines={1}
                  >
                    {n.title ?? TYPE_LABEL[n.type]}
                  </Text>
                  {!n.isRead ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.bodyText} numberOfLines={2}>
                  {n.body ?? ''}
                </Text>
                <Text style={styles.timestamp}>{formatRelative(n.sentAt)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  scroll: { paddingVertical: SPACING[2] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerBtn: { width: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { fontSize: 28, color: COLORS.gray[700] },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  headerSubtitle: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500], marginTop: 2 },
  headerAction: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brand[500],
    fontWeight: FONT_WEIGHT.semibold,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: SPACING[3],
  },
  rowUnread: { backgroundColor: COLORS.brand[50] },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 20 },
  body: { flex: 1 },
  bodyTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  title: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[800],
  },
  titleUnread: { fontWeight: FONT_WEIGHT.bold, color: COLORS.gray[900] },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brand[500],
  },
  bodyText: {
    marginTop: 2,
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[600],
    lineHeight: 18,
  },
  timestamp: {
    marginTop: SPACING[1],
    fontSize: 11,
    color: COLORS.gray[400],
  },
});
