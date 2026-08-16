import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SvgUri } from 'react-native-svg';
import { DraggableSheet } from '@/components/common/DraggableSheet';
import { Button } from '@/components/common/Button';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { TextInput } from '@/components/common/TextInput';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import type { BucketId } from './CategoryBucketCard';

export interface CustomCategoryInput {
  name: string;
  bucketId: BucketId;
  color: string;
  pickedUri: string;
  ext: 'svg' | 'png';
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CustomCategoryInput) => void;
  loading?: boolean;
}

const BUCKET_OPTIONS: { id: BucketId; label: string; color: string }[] = [
  { id: 'needs', label: 'Thiết yếu', color: COLORS.primary },
  { id: 'wants', label: 'Mong muốn', color: COLORS.secondary },
  { id: 'savings', label: 'Tiết kiệm', color: COLORS.tertiary },
];

const COLOR_SWATCHES = [
  '#F97316', '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6',
  '#F59E0B', '#22C55E', '#EF4444', '#0EA5E9', '#D946EF',
];

const S = {
  title: 'Danh mục tuỳ chỉnh',
  nameLabel: 'Tên danh mục',
  namePlaceholder: 'VD: Thú cưng',
  bucketLabel: 'Hũ',
  colorLabel: 'Màu',
  iconLabel: 'Biểu tượng',
  iconPick: 'Chọn ảnh (SVG hoặc PNG)',
  iconChange: 'Đổi ảnh',
  iconHint: 'Ảnh chỉ lưu trên máy này — không tải lên máy chủ.',
  pickError: 'Không đọc được file. Vui lòng chọn ảnh SVG hoặc PNG khác.',
  submit: 'Tạo danh mục',
  cancel: 'Huỷ',
};

function extFromAsset(name: string, mimeType?: string): 'svg' | 'png' | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.svg') || mimeType === 'image/svg+xml') return 'svg';
  if (lower.endsWith('.png') || mimeType === 'image/png') return 'png';
  return null;
}

export function CustomCategorySheet({ visible, onClose, onSubmit, loading }: Props) {
  const [name, setName] = useState('');
  const [bucket, setBucket] = useState<BucketId | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ uri: string; ext: 'svg' | 'png' } | null>(null);

  const reset = () => {
    setName('');
    setBucket(null);
    setColor(null);
    setPicked(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickIcon = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/svg+xml', 'image/png'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const ext = extFromAsset(asset.name, asset.mimeType);
    if (!ext) {
      Alert.alert('', S.pickError);
      return;
    }
    setPicked({ uri: asset.uri, ext });
  };

  const canSubmit = name.trim().length > 0 && !!bucket && !!color && !!picked;

  const handleSubmit = () => {
    if (!canSubmit || !bucket || !color || !picked) return;
    onSubmit({ name: name.trim(), bucketId: bucket, color, pickedUri: picked.uri, ext: picked.ext });
  };

  return (
    <DraggableSheet visible={visible} onClose={handleClose}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{S.title}</Text>

        {/* Name field */}
        <View style={styles.field}>
          <Text style={styles.label}>{S.nameLabel}</Text>
          <TextInput
            placeholder={S.namePlaceholder}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Bucket picker */}
        <View style={styles.field}>
          <Text style={styles.label}>{S.bucketLabel}</Text>
          <View style={styles.chipRow}>
            {BUCKET_OPTIONS.map((opt) => {
              const selected = bucket === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.chip,
                    { borderColor: opt.color + '80', backgroundColor: opt.color + '1A' },
                    selected && { backgroundColor: opt.color + '33', borderColor: opt.color },
                  ]}
                  onPress={() => setBucket(opt.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: opt.color }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Color swatches */}
        <View style={styles.field}>
          <Text style={styles.label}>{S.colorLabel}</Text>
          <View style={styles.swatchRow}>
            {COLOR_SWATCHES.map((hex) => {
              const selected = color === hex;
              return (
                <TouchableOpacity
                  key={hex}
                  style={[
                    styles.swatch,
                    { backgroundColor: hex },
                    selected && styles.swatchSelected,
                  ]}
                  onPress={() => setColor(hex)}
                  activeOpacity={0.8}
                >
                  {selected && <MaterialIcon name="check" size={16} color={COLORS.white} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Icon picker */}
        <View style={styles.field}>
          <Text style={styles.label}>{S.iconLabel}</Text>
          <TouchableOpacity style={styles.iconPickRow} onPress={handlePickIcon} activeOpacity={0.7}>
            <View style={[styles.iconPreview, { backgroundColor: (color ?? COLORS.surfaceVariant) + '33' }]}>
              {picked ? (
                picked.ext === 'svg' ? (
                  <SvgUri uri={picked.uri} width={28} height={28} />
                ) : (
                  <Image source={{ uri: picked.uri }} style={styles.iconPreviewImage} resizeMode="contain" />
                )
              ) : (
                <MaterialIcon name="add_photo_alternate" size={24} color={COLORS.onSurfaceVariant} />
              )}
            </View>
            <Text style={styles.iconPickText}>{picked ? S.iconChange : S.iconPick}</Text>
          </TouchableOpacity>
          <Text style={styles.iconHint}>{S.iconHint}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title={S.submit}
            onPress={handleSubmit}
            variant="primary"
            loading={loading}
            disabled={!canSubmit}
          />
          <Button title={S.cancel} onPress={handleClose} variant="ghost" />
        </View>
      </ScrollView>
    </DraggableSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING[6],
    paddingBottom: SPACING[8],
    gap: SPACING[5],
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.onSurface,
    textAlign: 'center',
    marginBottom: SPACING[1],
  },
  field: {
    gap: SPACING[2],
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.onSurfaceVariant,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  chip: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1] + 2,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: COLORS.onSurface,
  },
  iconPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  iconPreview: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPreviewImage: {
    width: 28,
    height: 28,
  },
  iconPickText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
  iconHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant + 'B3',
  },
  actions: {
    gap: SPACING[2],
    marginTop: SPACING[4],
  },
});
