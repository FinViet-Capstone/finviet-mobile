import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CATEGORIES } from '@/constants/categories';
import { getCategoryIcon } from '@/constants/categoryIcons';
import { CATEGORY_DEFAULT_BUCKETS, CATEGORY_LIBRARY_STRINGS } from '@/data/categoryLibraryData';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';

export interface CategoryLibrarySheetProps {
  visible: boolean;
  targetBucket: 'needs' | 'wants' | 'savings';
  alreadyAddedIds: string[];
  onSelect: (categoryId: string) => void;
  onClose: () => void;
}

export function CategoryLibrarySheet({
  visible,
  targetBucket,
  alreadyAddedIds,
  onSelect,
  onClose,
}: CategoryLibrarySheetProps) {
  // Convert Material Symbols naming (underscore) to MaterialIcons naming (hyphen)
  const convertIconName = (symbolsName: string): string => {
    return symbolsName.replace(/_/g, '-');
  };

  // Filter available categories
  const availableCategories = useMemo(() => {
    return CATEGORIES.filter(
      (cat) =>
        !alreadyAddedIds.includes(cat.id) &&
        cat.id !== 'cat_income' && // Income doesn't belong to any bucket
        cat.id !== 'cat_other' // Other is a catch-all, not assignable
    );
  }, [alreadyAddedIds]);

  // Group by default bucket
  const groupedCategories = useMemo(() => {
    const groups: Record<'needs' | 'wants' | 'savings', typeof CATEGORIES[number][]> = {
      needs: [],
      wants: [],
      savings: [],
    };

    availableCategories.forEach((cat) => {
      const bucket = CATEGORY_DEFAULT_BUCKETS[cat.id];
      if (bucket) {
        groups[bucket].push(cat);
      }
    });

    return groups;
  }, [availableCategories]);

  const handleSelect = (categoryId: string) => {
    onSelect(categoryId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheet}>
                {/* Handle bar */}
                <View style={styles.handleBar} />

                {/* Header */}
                <View style={styles.header}>
                  <View>
                    <Text style={styles.title}>{CATEGORY_LIBRARY_STRINGS.title}</Text>
                    <Text style={styles.subtitle}>{CATEGORY_LIBRARY_STRINGS.subtitle}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="close" size={24} color={COLORS.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {availableCategories.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>
                        {CATEGORY_LIBRARY_STRINGS.emptyState}
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Render each bucket section */}
                      {(['needs', 'wants', 'savings'] as const).map((bucket) => {
                        const categories = groupedCategories[bucket];
                        if (categories.length === 0) return null;

                        return (
                          <View key={bucket} style={styles.section}>
                            <Text style={styles.sectionTitle}>
                              {CATEGORY_LIBRARY_STRINGS.sectionTitles[bucket]}
                            </Text>
                            {categories.map((category) => {
                              const iconName = convertIconName(getCategoryIcon(category.icon));
                              const isTargetBucket = bucket === targetBucket;

                              return (
                                <TouchableOpacity
                                  key={category.id}
                                  style={[
                                    styles.categoryRow,
                                    isTargetBucket && styles.categoryRowHighlight,
                                  ]}
                                  onPress={() => handleSelect(category.id)}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.categoryLeft}>
                                    <MaterialIcons
                                      name={iconName as any}
                                      size={24}
                                      color={COLORS.onSurface}
                                    />
                                    <Text style={styles.categoryLabel}>{category.nameVi}</Text>
                                  </View>
                                  {isTargetBucket && (
                                    <View style={styles.recommendedBadge}>
                                      <Text style={styles.recommendedText}>Đề xuất</Text>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        );
                      })}
                    </>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    height: '80%',
    paddingBottom: SPACING[4],
  },
  handleBar: {
    width: 32,
    height: 4,
    backgroundColor: COLORS.outlineVariant,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'center',
    marginTop: SPACING[2],
    marginBottom: SPACING[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
    marginBottom: SPACING[1],
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
  },
  closeButton: {
    padding: SPACING[1],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
  },
  emptyState: {
    paddingVertical: SPACING[8],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurfaceVariant,
  },
  section: {
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    marginBottom: SPACING[2],
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryRowHighlight: {
    borderColor: `${COLORS.primary}40`,
    backgroundColor: `${COLORS.primaryContainer}20`,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    flex: 1,
  },
  categoryLabel: {
    fontSize: FONT_SIZE.base,
    color: COLORS.onSurface,
    fontWeight: FONT_WEIGHT.medium,
  },
  recommendedBadge: {
    backgroundColor: COLORS.primaryContainer,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.sm,
  },
  recommendedText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onPrimaryContainer,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
