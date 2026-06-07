import { Tabs, router } from 'expo-router';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import TabBarIcon from '@/components/common/TabBarIcon';
import { COLORS } from '@/constants/theme';

function EntryTabButton({ onPress }: BottomTabBarButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.entryWrapper}
    >
      <View style={styles.entryButton}>
        <MaterialIcon name="add" color={COLORS.white} size={28} />
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   COLORS.brand[500],
        tabBarInactiveTintColor: COLORS.gray[400],
        tabBarStyle: {
          borderTopColor: COLORS.gray[200],
          height: 60,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="report"
        options={{
          title: 'Báo cáo',
          tabBarIcon: ({ color, size }) => <TabBarIcon icon="bar_chart" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Giao dịch',
          tabBarIcon: ({ color, size }) => <TabBarIcon icon="calendar_month" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="entry"
        options={{
          title: '',
          tabBarButton: (props) => <EntryTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Ví',
          tabBarIcon: ({ color, size }) => <TabBarIcon icon="account_balance_wallet" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Khác',
          tabBarIcon: ({ color, size }) => <TabBarIcon icon="menu" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  entryWrapper: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.brand[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 6,
    elevation: 6,
  },
});
