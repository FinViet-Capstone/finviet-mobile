import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import EntryChooserScreen from '@/screens/entry/EntryChooserScreen';
import ManualEntryScreen  from '@/screens/entry/ManualEntryScreen';
import PhotoEntryScreen   from '@/screens/entry/PhotoEntryScreen';
import PhotoConfirmScreen from '@/screens/entry/PhotoConfirmScreen';

export type EntryStackParamList = {
  EntryChooser:  undefined;
  ManualEntry:   { prefillDate?: string };
  PhotoEntry:    undefined;
  PhotoConfirm:  { imageUri: string };
};

const Stack = createNativeStackNavigator<EntryStackParamList>();

export default function EntryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="EntryChooser"  component={EntryChooserScreen} options={{ title: 'Thêm giao dịch' }} />
      <Stack.Screen name="ManualEntry"   component={ManualEntryScreen}  options={{ title: 'Nhập tay' }} />
      <Stack.Screen name="PhotoEntry"    component={PhotoEntryScreen}   options={{ title: 'Chụp ảnh' }} />
      <Stack.Screen name="PhotoConfirm"  component={PhotoConfirmScreen} options={{ title: 'Xác nhận' }} />
    </Stack.Navigator>
  );
}
