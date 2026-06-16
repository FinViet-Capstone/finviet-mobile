import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { Button } from '@/components/common/Button';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import {
  useSubscriptionPlans,
  useCurrentSubscription,
  useUpgradePlan,
} from '@/hooks/useSubscription';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { SUBSCRIPTION_STRINGS } from '@/data/settingsScreensData';
import type { PlanCode } from '@/types/subscription';

// Feature row inside a plan card
interface FeatureRowProps {
  text: string;
  checked: boolean;
}

function FeatureRow({ text, checked }: FeatureRowProps) {
  return (
    <View style={styles.featureRow}>
      <MaterialIcon
        name={checked ? 'check_circle' : 'check'}
        size={20}
        color={checked ? COLORS.tertiary : COLORS.onSurfaceVariant}
      />
      <Text style={[styles.featureText, !checked && styles.featureTextMuted]}>
        {text}
      </Text>
    </View>
  );
}

export function SubscriptionScreen() {
  const {
    data: plans,
    isLoading: plansLoading,
    isError: plansError,
    refetch: refetchPlans,
  } = useSubscriptionPlans();

  const {
    data: current,
    isLoading: currentLoading,
    isError: currentError,
    refetch: refetchCurrent,
  } = useCurrentSubscription();

  const upgradeMutation = useUpgradePlan();

  const isLoading = plansLoading || currentLoading;
  const isError = plansError || currentError;

  if (isLoading) return <LoadingSpinner />;
  if (isError) return (
    <ErrorState
      message="Không tải được thông tin gói dịch vụ"
      onRetry={() => { refetchPlans(); refetchCurrent(); }}
    />
  );

  const premiumPlan = plans?.find(p => p.planCode === 'premium');
  const freePlan = plans?.find(p => p.planCode === 'free');
  const isPremium = current?.planCode === 'premium';

  const handleUpgrade = () => {
    upgradeMutation.mutate({ planCode: 'premium', billingCycle: 'monthly' });
  };

  const formatPrice = (price: number) =>
    `₫${price.toLocaleString('vi-VN')}`;

  return (
    <View style={styles.root}>
      {/* Ambient background blobs */}
      <View style={styles.blobTop} pointerEvents="none" />
      <View style={styles.blobBottom} pointerEvents="none" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current plan banner */}
        <View style={styles.currentBanner}>
          <View>
            <Text style={styles.currentLabel}>
              {SUBSCRIPTION_STRINGS.currentPlan.toUpperCase()}
            </Text>
            <Text style={styles.currentValue}>
              {current?.planCode === 'premium'
                ? premiumPlan?.nameVi ?? 'Premium'
                : freePlan?.nameVi ?? 'Miễn phí'}
            </Text>
          </View>
          <View style={styles.inUseBadge}>
            <Text style={styles.inUseText}>{SUBSCRIPTION_STRINGS.inUse}</Text>
          </View>
        </View>

        {/* Plans horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.plansRow}
          snapToInterval={296}
          decelerationRate="fast"
        >
          {/* Premium card */}
          {premiumPlan && (
            <View style={styles.premiumCardWrapper}>
              {/* Purple glow */}
              <View style={styles.purpleGlow} pointerEvents="none" />
              <View style={styles.premiumCard}>
                {/* Decorative stars icon */}
                <MaterialIcon
                  name="stars"
                  size={64}
                  color={COLORS.primary + '33'}
                  style={styles.decorStars}
                />
                <View style={styles.planHeader}>
                  <MaterialIcon name="workspace_premium" size={22} color={COLORS.primary} />
                  <Text style={styles.premiumTitle}>Premium</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceValue}>
                    {formatPrice(premiumPlan.monthlyPrice)}
                  </Text>
                  <Text style={styles.priceUnit}>{SUBSCRIPTION_STRINGS.perMonth}</Text>
                </View>
                <View style={styles.featureList}>
                  {premiumPlan.featuresVi.map((f, i) => (
                    <FeatureRow key={i} text={f} checked />
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Free card */}
          {freePlan && (
            <View style={[styles.freeCardWrapper, isPremium && styles.dimmed]}>
              <View style={styles.freeCard}>
                <Text style={styles.freeTitle}>{freePlan.nameVi}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceValueMuted}>₫0</Text>
                  <Text style={styles.priceUnit}>{SUBSCRIPTION_STRINGS.perMonth}</Text>
                </View>
                <View style={styles.featureList}>
                  {freePlan.featuresVi.map((f, i) => (
                    <FeatureRow key={i} text={f} checked={false} />
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View style={styles.bottomCta}>
        <Button
          title={SUBSCRIPTION_STRINGS.upgradeButton}
          onPress={handleUpgrade}
          variant="primary"
          loading={upgradeMutation.isPending}
          disabled={isPremium}
          style={styles.upgradeBtn}
        />
        <View style={styles.safePayRow}>
          <MaterialIcon name="lock" size={12} color={COLORS.onSurfaceVariant} />
          <Text style={styles.safePayText}>{SUBSCRIPTION_STRINGS.safePayment}</Text>
        </View>
      </View>
    </View>
  );
}

const CARD_WIDTH = 280;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  blobTop: {
    position: 'absolute',
    top: '-10%' as any,
    left: '-10%' as any,
    width: '50%' as any,
    height: '50%' as any,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary + '1A',
  },
  blobBottom: {
    position: 'absolute',
    bottom: '-10%' as any,
    right: '-10%' as any,
    width: '60%' as any,
    height: '60%' as any,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.tertiaryContainer + '0D',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
    paddingBottom: 140,
    gap: SPACING[6],
  },
  // Current plan banner
  currentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainerHigh + '66',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.white + '1A',
    padding: SPACING[4],
  },
  currentLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: SPACING[1],
  },
  currentValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
  },
  inUseBadge: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  inUseText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
  },
  // Plans row
  plansRow: {
    paddingHorizontal: SPACING[4],
    gap: SPACING[4],
  },
  // Premium card
  premiumCardWrapper: {
    width: CARD_WIDTH,
    position: 'relative',
  },
  purpleGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primaryContainer + '66',
    top: '50%' as any,
    left: '50%' as any,
    marginTop: -100,
    marginLeft: -100,
    zIndex: -1,
  },
  premiumCard: {
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[6],
    backgroundColor: COLORS.primaryContainer + '26',
    borderWidth: 1,
    borderColor: COLORS.primary + '4D',
    overflow: 'hidden',
    minHeight: 240,
  },
  decorStars: {
    position: 'absolute',
    top: SPACING[4],
    right: SPACING[4],
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  premiumTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING[1],
    marginBottom: SPACING[6],
  },
  priceValue: {
    fontSize: 28,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
    lineHeight: 36,
  },
  priceValueMuted: {
    fontSize: 28,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
    lineHeight: 36,
  },
  priceUnit: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurfaceVariant,
    marginBottom: 4,
  },
  featureList: {
    gap: SPACING[2],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
  },
  featureText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurface,
    flex: 1,
  },
  featureTextMuted: {
    color: COLORS.onSurfaceVariant,
  },
  // Free card
  freeCardWrapper: {
    width: CARD_WIDTH,
  },
  dimmed: { opacity: 0.7 },
  freeCard: {
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[6],
    backgroundColor: COLORS.surfaceContainerHigh + '66',
    borderWidth: 1,
    borderColor: COLORS.white + '1A',
    minHeight: 240,
  },
  freeTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurface,
    marginBottom: SPACING[2],
  },
  // Bottom CTA
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[8],
    backgroundColor: COLORS.background,
  },
  upgradeBtn: {
    height: 56,
    borderRadius: BORDER_RADIUS.full,
  },
  safePayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    marginTop: SPACING[2],
  },
  safePayText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant,
  },
});
