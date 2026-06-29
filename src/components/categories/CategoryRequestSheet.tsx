import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { DraggableSheet } from '@/components/common/DraggableSheet';
import { Button } from '@/components/common/Button';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import type { BucketId } from './CategoryBucketCard';

export interface CategoryRequestInput {
  name: string;
  type: 'expense' | 'income';
  suggestedBucket: BucketId | null;
  notes: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CategoryRequestInput) => void;
  loading?: boolean;
}

const BUCKET_OPTIONS: { id: BucketId; label: string; color: string }[] = [
  { id: 'needs',   label: 'Thiết yếu', color: COLORS.primary },
  { id: 'wants',   label: 'Mong muốn', color: COLORS.secondary },
  { id: 'savings', label: 'Tiết kiệm', color: COLORS.tertiary },
];

export function CategoryRequestSheet({ visible, onClose, onSubmit, loading }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [bucket, setBucket] = useState<BucketId | null>(null);
  const [notes, setNotes] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);

  const handleSubmit = () => {
    onSubmit({ name, type, suggestedBucket: bucket, notes });
  };

  const handleClose = () => {
    setName('');
    setType('expense');
    setBucket(null);
    setNotes('');
    onClose();
  };

  return (
    <DraggableSheet visible={visible} onClose={handleClose}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>Yêu cầu danh mục mới</Text>

        {/* Name field */}
        <View style={styles.field}>
          <Text style={styles.label}>Tên danh mục</Text>
          <TextInput
            style={[styles.input, nameFocused && styles.inputFocused]}
            placeholder="VD: Thú cưng"
            placeholderTextColor={COLORS.onSurfaceVariant + '80'}
            value={name}
            onChangeText={setName}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
          />
        </View>

        {/* Type toggle */}
        <View style={styles.field}>
          <Text style={styles.label}>Loại</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'expense' && styles.toggleBtnActive]}
              onPress={() => setType('expense')}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, type === 'expense' && styles.toggleTextActive]}>
                Chi tiêu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'income' && styles.toggleBtnActive]}
              onPress={() => setType('income')}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, type === 'income' && styles.toggleTextActive]}>
                Thu nhập
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Suggested bucket */}
        <View style={styles.field}>
          <Text style={styles.label}>Hũ gợi ý</Text>
          <View style={styles.bucketRow}>
            {BUCKET_OPTIONS.map((opt) => {
              const selected = bucket === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.bucketChip,
                    { borderColor: opt.color + '80', backgroundColor: opt.color + '1A' },
                    selected && { backgroundColor: opt.color + '33', borderColor: opt.color },
                  ]}
                  onPress={() => setBucket(selected ? null : opt.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.bucketChipText, { color: opt.color }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes field */}
        <View style={styles.field}>
          <Text style={styles.label}>Ghi chú (tuỳ chọn)</Text>
          <TextInput
            style={[styles.input, styles.textArea, notesFocused && styles.inputFocused]}
            placeholder="Lý do bạn cần danh mục này"
            placeholderTextColor={COLORS.onSurfaceVariant + '80'}
            value={notes}
            onChangeText={setNotes}
            onFocus={() => setNotesFocused(true)}
            onBlur={() => setNotesFocused(false)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <MaterialIcon name="info" size={18} color={COLORS.onSurfaceVariant + 'B3'} />
          <Text style={styles.infoText}>
            Yêu cầu sẽ được quản trị viên duyệt trước khi thêm vào danh sách.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Gửi yêu cầu"
            onPress={handleSubmit}
            variant="primary"
            loading={loading}
            disabled={!name.trim()}
          />
          <Button
            title="Huỷ"
            onPress={handleClose}
            variant="ghost"
          />
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
  input: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '4D',
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  textArea: {
    minHeight: 80,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[1],
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '33',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: SPACING[2],
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.surfaceVariant,
  },
  toggleText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.onSurfaceVariant,
  },
  toggleTextActive: {
    color: COLORS.onSurface,
    fontWeight: FONT_WEIGHT.bold,
  },
  bucketRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  bucketChip: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1] + 2,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  bucketChipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    backgroundColor: COLORS.surfaceContainer + '80',
    padding: SPACING[3] + 2,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '1A',
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.onSurfaceVariant + 'B3',
    lineHeight: 18,
  },
  actions: {
    gap: SPACING[2],
    marginTop: SPACING[4],
  },
});
