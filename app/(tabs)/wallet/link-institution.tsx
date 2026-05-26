import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
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
import { Button } from '@/components/common/Button';
import { getInstitutions } from '@/services/linkedWalletSync';
import type { FinVerseInstitution } from '@/services/finverse';

export default function LinkInstitutionScreen() {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<FinVerseInstitution[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    loadInstitutions();
  }, []);

  const loadInstitutions = async () => {
    try {
      const data = await getInstitutions('VN');
      setInstitutions(data);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải danh sách ngân hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInstitution = (institution: FinVerseInstitution) => {
    router.push({
      pathname: '/wallet/link-authenticate',
      params: { institutionId: institution.id, institutionName: institution.name },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn ngân hàng</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand[500]} />
          <Text style={styles.loadingText}>Đang tải danh sách ngân hàng...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Chọn ngân hàng hoặc dịch vụ tài chính để liên kết
          </Text>

          {institutions.map((institution) => (
            <TouchableOpacity
              key={institution.id}
              style={styles.institutionCard}
              onPress={() => handleSelectInstitution(institution)}
              activeOpacity={0.7}
            >
              <View style={styles.institutionIcon}>
                <Text style={styles.institutionIconText}>🏦</Text>
              </View>
              <View style={styles.institutionInfo}>
                <Text style={styles.institutionName}>{institution.name}</Text>
                <Text style={styles.institutionCountry}>{institution.country}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}

          {institutions.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Không có ngân hàng nào khả dụng</Text>
              <Button
                title="Thử lại"
                onPress={loadInstitutions}
                style={styles.retryBtn}
              />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  scroll: { padding: SPACING[5], paddingBottom: SPACING[12] },

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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[3],
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[600],
  },

  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[600],
    marginBottom: SPACING[4],
    textAlign: 'center',
  },

  institutionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOW.sm,
  },
  institutionIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  institutionIconText: {
    fontSize: FONT_SIZE.xl,
  },
  institutionInfo: {
    flex: 1,
  },
  institutionName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray[900],
    marginBottom: SPACING[1],
  },
  institutionCountry: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray[500],
  },
  chevron: {
    fontSize: 24,
    color: COLORS.gray[400],
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[12],
  },
  emptyText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray[600],
    marginBottom: SPACING[4],
  },
  retryBtn: {
    minWidth: 120,
  },
});
