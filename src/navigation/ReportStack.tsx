import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ReportScreen        from '@/screens/report/ReportScreen';
import SpendingScoreDetail from '@/screens/report/SpendingScoreDetail';
import WeeklyReportScreen  from '@/screens/report/WeeklyReportScreen';
import AIAdvisorChat       from '@/screens/report/AIAdvisorChat';

export type ReportStackParamList = {
  Report:             undefined;
  SpendingScoreDetail: undefined;
  WeeklyReport:       undefined;
  AIAdvisorChat:      undefined;
};

const Stack = createNativeStackNavigator<ReportStackParamList>();

export default function ReportStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Report"              component={ReportScreen}        options={{ title: 'Báo cáo' }} />
      <Stack.Screen name="SpendingScoreDetail" component={SpendingScoreDetail} options={{ title: 'Chấm điểm ví' }} />
      <Stack.Screen name="WeeklyReport"        component={WeeklyReportScreen}  options={{ title: 'Báo cáo tuần' }} />
      <Stack.Screen name="AIAdvisorChat"       component={AIAdvisorChat}       options={{ title: 'Tư vấn AI' }} />
    </Stack.Navigator>
  );
}
