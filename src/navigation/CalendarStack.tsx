import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CalendarScreen  from '@/screens/calendar/CalendarScreen';
import EditEntryScreen from '@/screens/calendar/EditEntryScreen';

export type CalendarStackParamList = {
  Calendar:  undefined;
  EditEntry: { transactionId: string };
};

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export default function CalendarStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Calendar"  component={CalendarScreen}  options={{ title: 'Lịch chi tiêu' }} />
      <Stack.Screen name="EditEntry" component={EditEntryScreen} options={{ title: 'Chỉnh sửa giao dịch' }} />
    </Stack.Navigator>
  );
}
