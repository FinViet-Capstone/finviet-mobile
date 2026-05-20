import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WalletListScreen   from '@/screens/wallet/WalletListScreen';
import WalletDetailScreen from '@/screens/wallet/WalletDetailScreen';
import CreateWalletScreen from '@/screens/wallet/CreateWalletScreen';
import TransferScreen     from '@/screens/wallet/TransferScreen';
import GoalsScreen        from '@/screens/wallet/GoalsScreen';
import GoalDetailScreen   from '@/screens/wallet/GoalDetailScreen';

export type WalletStackParamList = {
  WalletList:   undefined;
  WalletDetail: { walletId: string };
  CreateWallet: undefined;
  Transfer:     undefined;
  Goals:        undefined;
  GoalDetail:   { goalId: string };
};

const Stack = createNativeStackNavigator<WalletStackParamList>();

export default function WalletStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="WalletList"   component={WalletListScreen}   options={{ title: 'Ví của tôi' }} />
      <Stack.Screen name="WalletDetail" component={WalletDetailScreen} options={{ title: 'Chi tiết ví' }} />
      <Stack.Screen name="CreateWallet" component={CreateWalletScreen} options={{ title: 'Tạo ví mới' }} />
      <Stack.Screen name="Transfer"     component={TransferScreen}     options={{ title: 'Chuyển tiền' }} />
      <Stack.Screen name="Goals"        component={GoalsScreen}        options={{ title: 'Mục tiêu tiết kiệm' }} />
      <Stack.Screen name="GoalDetail"   component={GoalDetailScreen}   options={{ title: 'Chi tiết mục tiêu' }} />
    </Stack.Navigator>
  );
}
