import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MoreMenuScreen        from '@/screens/more/MoreMenuScreen';
import ProfileScreen         from '@/screens/more/ProfileScreen';
import PreferencesScreen     from '@/screens/more/PreferencesScreen';
import NotificationsScreen   from '@/screens/more/NotificationsScreen';
import InterestCalcScreen    from '@/screens/more/InterestCalcScreen';
import SplitCalcScreen       from '@/screens/more/SplitCalcScreen';
import CSVImportScreen       from '@/screens/more/CSVImportScreen';
import CSVPreviewScreen      from '@/screens/more/CSVPreviewScreen';
import BudgetListScreen      from '@/screens/budget/BudgetListScreen';
import BudgetDetailScreen    from '@/screens/budget/BudgetDetailScreen';

export type MoreStackParamList = {
  MoreMenu:      undefined;
  Profile:       undefined;
  Preferences:   undefined;
  Notifications: undefined;
  InterestCalc:  undefined;
  SplitCalc:     undefined;
  CSVImport:     undefined;
  CSVPreview:    { fileUri: string };
  BudgetList:    undefined;
  BudgetDetail:  { budgetId: string };
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export default function MoreStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MoreMenu"      component={MoreMenuScreen}      options={{ title: 'Khác' }} />
      <Stack.Screen name="Profile"       component={ProfileScreen}       options={{ title: 'Hồ sơ' }} />
      <Stack.Screen name="Preferences"   component={PreferencesScreen}   options={{ title: 'Cài đặt' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
      <Stack.Screen name="InterestCalc"  component={InterestCalcScreen}  options={{ title: 'Tính lãi tiết kiệm' }} />
      <Stack.Screen name="SplitCalc"     component={SplitCalcScreen}     options={{ title: 'Chia hóa đơn' }} />
      <Stack.Screen name="CSVImport"     component={CSVImportScreen}     options={{ title: 'Nhập CSV' }} />
      <Stack.Screen name="CSVPreview"    component={CSVPreviewScreen}    options={{ title: 'Xem trước CSV' }} />
      <Stack.Screen name="BudgetList"    component={BudgetListScreen}    options={{ title: 'Ngân sách' }} />
      <Stack.Screen name="BudgetDetail"  component={BudgetDetailScreen}  options={{ title: 'Chi tiết ngân sách' }} />
    </Stack.Navigator>
  );
}
