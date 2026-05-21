import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import {
  BORDER_RADIUS,
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SHADOW,
  SPACING,
} from '@/constants/theme';
import { Button } from '@/components/common/Button';

// Non-entity UI content: static copy for photo source option cards.
const MOCK_PHOTO_OPTIONS = [
  {
    id: 'camera' as const,
    icon: '📷',
    title: 'Chụp ảnh mới',
    description: 'Mở camera để chụp ảnh hóa đơn hoặc biên lai.',
  },
  {
    id: 'gallery' as const,
    icon: '🖼',
    title: 'Chọn từ thư viện',
    description: 'Tải ảnh có sẵn từ bộ nhớ điện thoại.',
  },
] as const;

type PhotoOptionId = 'camera' | 'gallery';

export default function PhotoEntryScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCamera = async () => {
    setPermissionError(null);
    setIsLoading(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setPermissionError(
          'Camera chưa được cấp quyền. Vui lòng cấp quyền trong Cài đặt.',
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      router.push(
        ('/(tabs)/entry/photo-confirm?uri=' + encodeURIComponent(uri)) as never,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGallery = async () => {
    setPermissionError(null);
    setIsLoading(true);
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setPermissionError(
          'Thư viện ảnh chưa được cấp quyền. Vui lòng cấp quyền trong Cài đặt.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      router.push(
        ('/(tabs)/entry/photo-confirm?uri=' + encodeURIComponent(uri)) as never,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const handleOptionPress = (id: PhotoOptionId) => {
    if (id === 'camera') {
      void handleCamera();
    } else {
      void handleGallery();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{'Chụp Ảnh'}</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.subtitle}>{'Chọn phương thức lấy ảnh'}</Text>

        {MOCK_PHOTO_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.card, isLoading && styles.cardDisabled]}
            onPress={() => handleOptionPress(option.id)}
            activeOpacity={0.75}
            disabled={isLoading}
          >
            <View style={styles.iconWrapper}>
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.brand[500]} />
              ) : (
                <Text style={styles.cardIcon}>{option.icon}</Text>
              )}
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardDescription}>{option.description}</Text>
            </View>
            <Text style={styles.chevron}>{'\u203a'}</Text>
          </TouchableOpacity>
        ))}

        {/* Permission denied banner */}
        {permissionError !== null ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{permissionError}</Text>
            <Button
              title="Mở Cài Đặt"
              onPress={handleOpenSettings}
              variant="secondary"
              style={styles.settingsBtn}
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    lineHeight: 32,
    color: COLORS.gray[700],
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  body: {
    flex: 1,
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[6],
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING[4],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[5],
    marginBottom: SPACING[4],
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brand[500],
    ...SHADOW.md,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[4],
  },
  cardIcon: {
    fontSize: 28,
    lineHeight: 34,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.brand[500],
    marginBottom: SPACING[1],
  },
  cardDescription: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.normal,
    color: COLORS.gray[500],
    lineHeight: 20,
  },
  chevron: {
    fontSize: FONT_SIZE['2xl'],
    color: COLORS.gray[300],
    lineHeight: 28,
    marginLeft: SPACING[2],
  },
  errorCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[5],
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    ...SHADOW.sm,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[700],
    lineHeight: 20,
    marginBottom: SPACING[4],
  },
  settingsBtn: {
    alignSelf: 'flex-start',
  },
});
