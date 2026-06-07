import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/constants/theme';
import { ONBOARDING_STRINGS, CATEGORY_GROUPS } from '@/data/onboardingData';

export interface OnboardingCategoriesProps {
  readonly categories: {
    essential: string[];
    wants: string[];
    savings: string[];
  };
  readonly onAddCategory: (group: 'essential' | 'wants' | 'savings', category: string) => void;
  readonly onRemoveCategory: (group: 'essential' | 'wants' | 'savings', category: string) => void;
  readonly onSkip: () => void;
  readonly onNext: () => void;
}

export function OnboardingCategories({
  categories,
  onAddCategory,
  onRemoveCategory,
  onSkip,
  onNext,
}: OnboardingCategoriesProps) {
  const getColorForGroup = (color: string) => {
    const colorMap: Record<string, string> = {
      primary: COLORS.primary,
      secondary: COLORS.secondary,
      tertiary: COLORS.tertiary,
    };
    return colorMap[color] || COLORS.primary;
  };

  const getIconForCategory = (icon: string): string => {
    const iconMap: Record<string, string> = {
      restaurant: '🍽️',
      home: '🏠',
      directions_car: '🚗',
      movie: '🎬',
      shopping_bag: '🛍️',
      trending_up: '📈',
      savings: '💰',
    };
    return iconMap[icon] || '📊';
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
          {CATEGORY_GROUPS.map((group) => {
            const color = getColorForGroup(group.color);
            return (
              <View key={group.id} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <View style={[styles.colorDot, { backgroundColor: color }]} />
                  <Text style={[styles.groupTitle, { color }]}>{group.name}</Text>
                </View>

                <View style={styles.chipsContainer}>
                  {group.categories.map((category, index) => (
                    <View
                      key={`${category.icon}-${index}`}
                      style={[styles.chip, { borderColor: `${color}80` }]}
                    >
                      <Text style={styles.chipIcon}>{getIconForCategory(category.icon)}</Text>
                      <Text style={styles.chipLabel}>{category.label}</Text>
                    </View>
                  ))}

                  {/* Add Button */}
                  <TouchableOpacity
                    style={[styles.addChip, { borderColor: COLORS.outline }]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addIcon}>+</Text>
                    <Text style={styles.addLabel}>
                      {ONBOARDING_STRINGS.categories.addCategory}
                    </Text>
                  </TouchableOpacity>
                </View>
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
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>
      </View>
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
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: COLORS.surfaceBright,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipIcon: {
    fontSize: 20,
  },
  chipLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurface,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
  },
  addIcon: {
    fontSize: 20,
    color: COLORS.onSurfaceVariant,
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
  arrowIcon: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.onPrimary,
  },
});
