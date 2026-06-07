import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { getCategoryIcon } from '@/constants/categoryIcons';
import { getCategoryById } from '@/constants/categories';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { ONBOARDING_STRINGS } from '@/data/onboardingData';
import { CategoryLibrarySheet } from './CategoryLibrarySheet';

type BucketType = 'essential' | 'wants' | 'savings';
type BucketKey = 'needs' | 'wants' | 'savings';

interface BucketConfig {
  id: BucketType;
  key: BucketKey;
  name: string;
  color: string;
}

export interface OnboardingCategoriesProps {
  readonly categories: {
    essential: string[];
    wants: string[];
    savings: string[];
  };
  readonly onAddCategory: (group: BucketType, categoryId: string) => void;
  readonly onRemoveCategory: (group: BucketType, categoryId: string) => void;
  readonly onReorderCategories?: (group: BucketType, newOrder: string[]) => void;
  readonly onSkip: () => void;
  readonly onNext: () => void;
}

const BUCKETS: BucketConfig[] = [
  { id: 'essential', key: 'needs', name: 'Thiết yếu', color: COLORS.primary },
  { id: 'wants', key: 'wants', name: 'Mong muốn', color: COLORS.secondary },
  { id: 'savings', key: 'savings', name: 'Tiết kiệm', color: COLORS.tertiary },
];

export function OnboardingCategories({
  categories,
  onAddCategory,
  onRemoveCategory,
  onReorderCategories,
  onSkip,
  onNext,
}: OnboardingCategoriesProps) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<BucketKey>('needs');

  // Convert Material Symbols naming (underscore) to MaterialIcons naming (hyphen)
  const convertIconName = (symbolsName: string): string => {
    return symbolsName.replace(/_/g, '-');
  };

  const handleOpenSheet = (bucketKey: BucketKey) => {
    setSelectedBucket(bucketKey);
    setSheetVisible(true);
  };

  const handleSelectCategory = (categoryId: string) => {
    const bucket = BUCKETS.find((b) => b.key === selectedBucket);
    if (bucket) {
      onAddCategory(bucket.id, categoryId);
    }
  };

  const handleRemoveCategory = (bucketId: BucketType, categoryId: string) => {
    onRemoveCategory(bucketId, categoryId);
  };

  const handleDragEnd = (bucketId: BucketType, newOrder: string[]) => {
    if (onReorderCategories) {
      onReorderCategories(bucketId, newOrder);
    }
  };

  // Get all already added category IDs across all buckets
  const alreadyAddedIds = [
    ...categories.essential,
    ...categories.wants,
    ...categories.savings,
  ];

  const renderCategoryItem = (
    { item: categoryId, drag, isActive }: RenderItemParams<string>,
    bucketId: BucketType,
    color: string
  ) => {
    const category = getCategoryById(categoryId);
    if (!category) return null;

    const iconName = convertIconName(getCategoryIcon(category.icon));

    return (
      <ScaleDecorator>
        <View style={styles.categoryItemWrapper}>
          <TouchableOpacity
            onLongPress={drag}
            disabled={isActive}
            style={[
              styles.categoryItem,
              { borderColor: `${color}40` },
              isActive && styles.categoryItemDragging,
            ]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="drag-indicator" size={20} color={COLORS.onSurfaceVariant} />
            <MaterialIcons name={iconName as any} size={20} color={COLORS.onSurface} />
            <Text style={styles.categoryLabel}>{category.nameVi}</Text>
            <TouchableOpacity
              onPress={() => handleRemoveCategory(bucketId, categoryId)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.removeButton}
            >
              <MaterialIcons name="close" size={18} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '75%' }]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{ONBOARDING_STRINGS.categories.title}</Text>
        <Text style={styles.subtitle}>{ONBOARDING_STRINGS.categories.subtitle}</Text>
      </View>

      {/* Category Groups */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.groupsContainer}>
          {BUCKETS.map((bucket) => {
            const categoryIds = categories[bucket.id];
            return (
              <View key={bucket.id} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <View style={[styles.colorDot, { backgroundColor: bucket.color }]} />
                  <Text style={[styles.groupTitle, { color: bucket.color }]}>{bucket.name}</Text>
                </View>

                <DraggableFlatList
                  data={categoryIds}
                  renderItem={(params) => renderCategoryItem(params, bucket.id, bucket.color)}
                  keyExtractor={(item) => item}
                  onDragEnd={({ data }) => handleDragEnd(bucket.id, data)}
                  scrollEnabled={false}
                  ListFooterComponent={
                    <TouchableOpacity
                      style={[styles.addButton, { borderColor: COLORS.outline }]}
                      activeOpacity={0.7}
                      onPress={() => handleOpenSheet(bucket.key)}
                    >
                      <MaterialIcons name="add" size={20} color={COLORS.onSurfaceVariant} />
                      <Text style={styles.addLabel}>Thêm từ thư viện</Text>
                    </TouchableOpacity>
                  }
                />
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.button}
          onPress={onNext}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>{ONBOARDING_STRINGS.categories.button}</Text>
          <MaterialIcons name="arrow-forward" size={24} color={COLORS.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Category Library Sheet */}
      <CategoryLibrarySheet
        visible={sheetVisible}
        targetBucket={selectedBucket}
        alreadyAddedIds={alreadyAddedIds}
        onSelect={handleSelectCategory}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.surfaceVariant,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderTopRightRadius: BORDER_RADIUS.full,
    borderBottomRightRadius: BORDER_RADIUS.full,
  },
  header: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[6],
    paddingBottom: SPACING[4],
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onBackground,
    textAlign: 'center',
    marginBottom: SPACING[2],
  },
  subtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[4],
  },
  groupsContainer: {
    gap: SPACING[3],
  },
  groupCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: `${COLORS.outlineVariant}4D`,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: BORDER_RADIUS.full,
  },
  groupTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
  },
  categoryItemWrapper: {
    marginBottom: SPACING[2],
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: COLORS.surfaceBright,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    minHeight: 48,
  },
  categoryItemDragging: {
    opacity: 0.8,
    transform: [{ scale: 1.02 }],
    backgroundColor: COLORS.surfaceContainerHighest,
  },
  categoryLabel: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
    fontWeight: FONT_WEIGHT.medium,
    flex: 1,
  },
  removeButton: {
    padding: SPACING[1],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    marginTop: SPACING[2],
    minHeight: 48,
  },
  addLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
  },
  bottomActions: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[8],
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.surfaceContainerHighest}80`,
  },
  button: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onPrimary,
  },
});
