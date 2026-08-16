import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { DraggableSheet } from '@/components/common/DraggableSheet';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/TextInput';
import { useUpdateProfile } from '@/hooks/useCustomer';
import { getApiErrorMessage } from '@/utils/errors';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentName: string;
}

export function EditProfileSheet({ visible, onClose, currentName }: Props) {
  const [name, setName] = useState(currentName);
  const updateProfile = useUpdateProfile();

  useEffect(() => {
    if (visible) setName(currentName);
  }, [visible, currentName]);

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await updateProfile.mutateAsync({ displayName: name.trim() });
      onClose();
    } catch (err) {
      Alert.alert('', getApiErrorMessage(err, 'Không thể lưu hồ sơ.'));
    }
  };

  return (
    <DraggableSheet visible={visible} onClose={onClose}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Chỉnh sửa hồ sơ</Text>
        <TextInput
          label="Tên hiển thị"
          placeholder="Nhập tên của bạn"
          value={name}
          onChangeText={setName}
          containerStyle={styles.field}
          editable={!updateProfile.isPending}
        />
        <View style={styles.actions}>
          <Button
            title="Lưu"
            onPress={handleSave}
            variant="primary"
            loading={updateProfile.isPending}
            disabled={!name.trim()}
          />
          <Button title="Huỷ" onPress={onClose} variant="ghost" disabled={updateProfile.isPending} />
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
  },
  field: {
    marginBottom: 0,
  },
  actions: {
    gap: SPACING[2],
    marginTop: SPACING[2],
  },
});
