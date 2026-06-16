import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { useCategoryRequests } from '@/hooks/useCategoryRequests';
import type { CategoryRequest, CategoryRequestStatus } from '@/types/category';
import { CATEGORY_REQUEST_STRINGS } from '@/data/settingsScreensData';

interface StatusBadgeProps {
  status: CategoryRequestStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const STATUS_CONFIG: Record<CategoryRequestStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
}> = {
  pending: {
    label: CATEGORY_REQUEST_STRINGS.statusPending,
    color: COLORS.secondary,
    bg: COLORS.secondaryContainer + '33',
    border: COLORS.secondaryContainer + '4D',
  },
  approved: {
    label: CATEGORY_REQUEST_STRINGS.statusApproved,
    color: COLORS.tertiary,
    bg: COLORS.tertiaryContainer + '33',
    border: COLORS.tertiaryContainer + '4D',
  },
  rejected: {
    label: CATEGORY_REQUEST_STRINGS.statusRejected,
    color: COLORS.error,
    bg: COLORS.errorContainer + '33',
    border: COLORS.errorContainer + '4D',
  },
};

interface RequestCardProps {
  item: CategoryRequest;
}

function RequestCard({ item }: RequestCardProps) {
  const isExpense = item.type === 'expense';
  const typeColor = isExpense ? COLORS.primary : COLORS.info;
  const typeLabel = isExpense
    ? CATEGORY_REQUEST_STRINGS.typeExpense
    : CATEGORY_REQUEST_STRINGS.typeIncome;

  const dateStr = new Date(item.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{item.nameVi}</Text>
          <View style={styles.cardMeta}>
            <View style={[styles.typePill, { backgroundColor: typeColor + '33' }]}>
              <Text style={[styles.typePillText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            <View style={styles.dateRow}>
              <MaterialIcon name="calendar_today" size={14} color={COLORS.onSurfaceVariant} />
              <Text style={styles.dateText}>{dateStr}</Text>
            </View>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>
      {item.status === 'rejected' && item.notes && (
        <View style={styles.rejectionRow}>
          <MaterialIcon name="info" size={16} color={COLORS.error} />
          <Text style={styles.rejectionText}>
            {CATEGORY_REQUEST_STRINGS.rejectionPrefix}{item.notes}
          </Text>
        </View>
      )}
    </View>
  );
}

interface CategoryRequestListScreenProps {
  onCreateNew?: () => void;
}

export function CategoryRequestListScreen({ onCreateNew }: CategoryRequestListScreenProps) {
  const { data: requests, isLoading, isError, refetch } = useCategoryRequests();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CategoryRequest>) => <RequestCard item={item} />,
    [],
  );

  const keyExtractor = useCallback((item: CategoryRequest) => item.id, []);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return (
    <ErrorState message="Không tải được danh sách yêu cầu" onRetry={refetch} />
  );
  if (!requests?.length) return (
    <EmptyState title="Chưa có yêu cầu nào" icon="category" />
  );

  return (
    <FlatList
      data={requests}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[6],
    paddingBottom: 80,
    gap: SPACING[4],
  },
  // Card
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    gap: SPACING[2],
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flex: 1,
    gap: SPACING[1],
  },
  cardTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginTop: SPACING[1],
    flexWrap: 'wrap',
  },
  typePill: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.full,
  },
  typePillText: {
    fontSize: FONT_SIZE.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  dateText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
  },
  // Status badge
  badge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  // Rejection note
  rejectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    marginTop: SPACING[2],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant + '4D',
  },
  rejectionText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
  },
});
