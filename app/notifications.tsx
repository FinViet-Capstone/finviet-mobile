import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '@/hooks/useNotifications';
import type { AppNotification, NotificationType } from '@/types/notification';
import { notificationRoute } from '@/lib/notificationRouting';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Thông báo',
  readAll: 'Đọc tất cả',
  empty: 'Không có thông báo nào',
  emptyHint: 'Các thông báo về ngân sách, báo cáo và mục tiêu sẽ xuất hiện ở đây',
  filters: [
    { key: 'all', label: 'Tất cả' },
    { key: 'budget_alert', label: 'Chi tiêu' },
    { key: 'weekly_report', label: 'Báo cáo AI' },
    { key: 'goal_milestone', label: 'Mục tiêu' },
    { key: 'announcement', label: 'Hệ thống' },
  ] as const,
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'CH' : 'SA';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

function groupLabel(iso: string): string {
  const now = new Date();
  const d = new Date(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const notifDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (notifDay.getTime() === today.getTime()) return S.today;
  if (notifDay.getTime() === yesterday.getTime()) return S.yesterday;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function notifIcon(type: NotificationType): string {
  switch (type) {
    case 'budget_alert': return 'warning';
    case 'weekly_report': return 'auto_awesome';
    case 'goal_milestone': return 'savings';
    case 'announcement': return 'campaign';
    default: return 'notifications';
  }
}

function notifIconColor(type: NotificationType, colors: ThemeColors): string {
  switch (type) {
    case 'budget_alert': return colors.error;
    case 'weekly_report': return colors.primary;
    case 'goal_milestone': return colors.tertiary;
    case 'announcement': return colors.secondary;
    default: return colors.onSurfaceVariant;
  }
}

function notifIconBg(type: NotificationType, colors: ThemeColors): string {
  switch (type) {
    case 'budget_alert': return withAlpha(colors.errorContainer, 0.19);
    case 'weekly_report': return withAlpha(colors.primaryContainer, 0.13);
    case 'goal_milestone': return withAlpha(colors.tertiaryContainer, 0.13);
    case 'announcement': return withAlpha(colors.secondaryContainer, 0.13);
    default: return colors.surfaceVariant;
  }
}

// ─── Notification row ─────────────────────────────────────────────────────────

const NotifRow = React.memo(function NotifRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const iconColor = notifIconColor(item.type, colors);
  const iconBg = notifIconBg(item.type, colors);
  const isWeeklyReport = item.type === 'weekly_report';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.notifRow, !item.isRead && styles.notifRowUnread]}
      onPress={() => onPress(item)}
    >
      {/* Unread dot */}
      {!item.isRead && <View style={styles.unreadDot} />}

      <View style={[styles.notifIconWrap, { backgroundColor: iconBg }]}>
        <MaterialIcon name={notifIcon(item.type)} size={22} color={iconColor} />
      </View>

      <View style={styles.notifContent}>
        <View style={styles.notifTitleRow}>
          <Text style={[styles.notifTitle, item.type === 'budget_alert' && { color: colors.error }]}
            numberOfLines={1}>
            {item.title ?? ''}
          </Text>
          {isWeeklyReport && (
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          )}
        </View>
        {item.body ? (
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        ) : null}
        <Text style={styles.notifTime}>{formatTime(item.sentAt)}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ─── Filter type ──────────────────────────────────────────────────────────────

type FilterKey = 'all' | NotificationType;

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: notifications = [], isLoading, isError, error, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = useMemo(() => {
    const all = notifications as AppNotification[];
    if (filter === 'all') return all;
    return all.filter((n) => n.type === filter);
  }, [notifications, filter]);

  // Group by date label
  const sections = useMemo(() => {
    const groups: Record<string, AppNotification[]> = {};
    filtered.forEach((n) => {
      const label = groupLabel(n.sentAt);
      if (!groups[label]) groups[label] = [];
      groups[label].push(n);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const handlePress = useCallback((item: AppNotification) => {
    if (!item.isRead) markRead.mutate(item.id);
    router.push(notificationRoute(item));
  }, [markRead, router]);

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate();
  }, [markAllRead]);

  const renderItem = useCallback(({ item }: { item: AppNotification }) => (
    <NotifRow item={item} onPress={handlePress} />
  ), [handlePress]);

  const renderSectionHeader = useCallback(({ section }: { section: { title: string } }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  ), [styles]);

  const keyExtractor = useCallback((item: AppNotification) => item.id, []);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;

  const hasUnread = (notifications as AppNotification[]).some((n) => !n.isRead);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.backBtn} onPress={() => router.back()}
          accessibilityRole="button" accessibilityLabel="Quay lại">
          <MaterialIcon name="arrow_back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.title}</Text>
        {hasUnread ? (
          <TouchableOpacity activeOpacity={0.7} style={styles.readAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.readAllText}>{S.readAll}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.readAllBtn} />
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filtersWrap}>
        <SectionList
          data={[]}
          sections={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <View style={styles.filterChips}>
              {S.filters.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  activeOpacity={0.7}
                  style={[styles.chip, filter === f.key && styles.chipActive]}
                  onPress={() => setFilter(f.key as FilterKey)}
                >
                  <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          }
        />
      </View>

      {/* Notification list */}
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcon name="notifications_off" size={48} color={colors.outlineVariant} />
          <Text style={styles.emptyTitle}>{S.empty}</Text>
          <Text style={styles.emptyHint}>{S.emptyHint}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  readAllBtn: {
    width: 80,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  readAllText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.primary,
  },
  filtersWrap: {
    paddingHorizontal: SPACING[4],
    marginBottom: SPACING[2],
  },
  filterChips: {
    flexDirection: 'row',
    gap: SPACING[2],
    flexWrap: 'nowrap',
  },
  chip: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[1] + 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  chipActive: {
    backgroundColor: withAlpha(colors.primary, 0.13),
    borderColor: withAlpha(colors.primary, 0.25),
  },
  chipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[12],
    gap: SPACING[2],
  },
  sectionHeader: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: SPACING[4],
    marginBottom: SPACING[2],
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    backgroundColor: withAlpha(colors.surfaceContainer, 0.4),
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    // Was `${colors.white}08` — white at ~3% alpha, invisible on the light
    // theme's near-white surface. outlineVariant is the token built for a
    // subtle hairline border in both themes.
    borderColor: withAlpha(colors.outlineVariant, 0.5),
    marginBottom: SPACING[2],
    overflow: 'hidden',
  },
  notifRowUnread: {
    borderColor: withAlpha(colors.primary, 0.13),
  },
  unreadDot: {
    position: 'absolute',
    top: SPACING[4],
    right: SPACING[4],
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  notifIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifContent: { flex: 1, paddingRight: SPACING[4] },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], marginBottom: 4 },
  notifTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
    flex: 1,
  },
  aiBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: withAlpha(colors.primary, 0.08),
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.19),
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  notifBody: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: SPACING[2],
  },
  notifTime: {
    fontSize: 11,
    color: colors.outline,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[3],
    paddingHorizontal: SPACING[8],
  },
  emptyTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurface,
  },
  emptyHint: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  });
}
