import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import {
  BORDER_RADIUS,
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from '@/constants/theme';
import { MaterialIcon } from '@/components/common/MaterialIcon';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Scan ảnh',
  galleryBtn: 'photo_library',
  tip: 'Căn chỉnh hóa đơn vào khung để quét chính xác nhất.',
  flashOff: 'flash_off',
  flashOn: 'flash_on',
  galleryIcon: 'image',
  cameraPermErr: 'Camera chưa được cấp quyền. Vui lòng cấp quyền trong Cài đặt.',
  galleryPermErr: 'Thư viện ảnh chưa được cấp quyền. Vui lòng cấp quyền trong Cài đặt.',
  openSettings: 'Mở Cài Đặt',
  recentScans: 'Ảnh gần đây',
  addPhoto: 'add',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PhotoEntryScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();

  const [isLoading, setIsLoading] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);

  const buildConfirmHref = (uris: string[]) => ({
    pathname: '/(tabs)/entry/photo-confirm' as const,
    params: dateParam ? { uris: JSON.stringify(uris), date: dateParam } : { uris: JSON.stringify(uris) },
  });

  const handleCamera = async () => {
    setPermError(null);
    setIsLoading(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { setPermError(S.cameraPermErr); return; }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (result.canceled) return;
      router.push(buildConfirmHref([result.assets[0].uri]));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGallery = async () => {
    setPermError(null);
    setIsLoading(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { setPermError(S.galleryPermErr); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });
      if (result.canceled) return;
      router.push(buildConfirmHref(result.assets.map((a) => a.uri)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Top navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} style={styles.topBtn} onPress={() => router.back()}>
          <MaterialIcon name="arrow_back" size={22} color={COLORS.onBackground} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{S.title}</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.topBtn} onPress={handleGallery}>
          <MaterialIcon name="photo_library" size={22} color={COLORS.onBackground} />
        </TouchableOpacity>
      </View>

      {/* Camera viewfinder area (top ~60%) */}
      <View style={styles.viewfinder}>
        {/* Dark overlay hint */}
        <View style={styles.overlay} pointerEvents="none" />

        {/* Scanning frame */}
        <View style={styles.frameWrap}>
          <View style={styles.scanFrame}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {/* Scan line animation placeholder */}
            <View style={styles.scanLine} />
          </View>
        </View>

        {/* Tip bubble */}
        <View style={styles.tipBubble}>
          <MaterialIcon name="info" size={16} color={COLORS.primary} />
          <Text style={styles.tipText}>{S.tip}</Text>
        </View>
      </View>

      {/* Bottom control panel */}
      <View style={styles.bottomPanel}>
        {/* Recent scans row */}
        <View style={styles.recentRow}>
          <TouchableOpacity activeOpacity={0.7} style={styles.recentThumb} onPress={handleGallery}>
            <View style={styles.recentThumbInner}>
              <MaterialIcon name="add" size={22} color={COLORS.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Permission error */}
        {permError && (
          <View style={styles.permErrWrap}>
            <Text style={styles.permErrText}>{permError}</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openSettings()}>
              <Text style={styles.permErrLink}>{S.openSettings}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Controls row */}
        <View style={styles.controlsRow}>
          {/* Flash toggle */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.controlBtn}
            onPress={() => setFlashOn((v) => !v)}
          >
            <MaterialIcon
              name={flashOn ? S.flashOn : S.flashOff}
              size={26}
              color={COLORS.onSurface}
            />
          </TouchableOpacity>

          {/* Shutter */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.shutter}
            onPress={handleCamera}
            disabled={isLoading}
          >
            <View style={[styles.shutterInner, isLoading && styles.disabled]}>
              <View style={styles.shutterCore} />
            </View>
          </TouchableOpacity>

          {/* Gallery */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.controlBtn}
            onPress={handleGallery}
            disabled={isLoading}
          >
            <MaterialIcon name="image" size={26} color={COLORS.onSurface} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CORNER_SIZE = 32;
const CORNER_BORDER = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surfaceContainerLowest },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    elevation: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    height: 64,
    paddingTop: SPACING[4],
  },
  topBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
  },
  topTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onBackground,
  },

  // Viewfinder
  viewfinder: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLowest,
    position: 'relative',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,13,21,0.6)',
  },
  frameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
  },
  scanFrame: {
    width: '78%',
    aspectRatio: 3 / 4,
    borderRadius: BORDER_RADIUS.xl,
    position: 'relative',
  },
  corner: {
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: COLORS.primary,
    borderStyle: 'solid',
    position: 'absolute',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_BORDER, borderLeftWidth: CORNER_BORDER, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_BORDER, borderRightWidth: CORNER_BORDER, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_BORDER, borderLeftWidth: CORNER_BORDER, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_BORDER, borderRightWidth: CORNER_BORDER, borderBottomRightRadius: 12 },
  scanLine: {
    position: 'absolute',
    top: '15%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },

  // Tip
  tipBubble: {
    position: 'absolute',
    bottom: SPACING[5],
    left: SPACING[4],
    right: SPACING[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: `${COLORS.surfaceContainer}E6`,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  tipText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurface,
    textAlign: 'center',
  },

  // Bottom panel
  bottomPanel: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING[5],
    paddingBottom: SPACING[6],
    paddingHorizontal: SPACING[4],
    gap: SPACING[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },

  // Recent row
  recentRow: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  recentThumb: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  recentThumbInner: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: BORDER_RADIUS.lg,
  },

  // Permission error
  permErrWrap: { gap: SPACING[1] },
  permErrText: { fontSize: FONT_SIZE.sm, color: COLORS.onSurfaceVariant },
  permErrLink: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },

  // Controls
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[5],
  },
  controlBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceContainerHighest,
  },

  // Shutter
  shutter: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 4,
    borderColor: COLORS.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${COLORS.primary}25`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },

  disabled: { opacity: 0.5 },
});
