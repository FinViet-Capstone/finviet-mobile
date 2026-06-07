import { Tabs } from 'expo-router';
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
        <MaterialIcon name="add" color={COLORS.onPrimary} size={28} />
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: `${COLORS.surfaceContainer}E6`,
          borderTopColor: `${COLORS.outlineVariant}66`,
          height: 64,
          paddingBottom: 10,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon="home" color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Lịch sử',
          tabBarIcon: ({ color }) => (
            <TabBarIcon icon="receipt_long" color={color} size={24} />
          ),
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
        name="wallets"
        options={{
          title: 'Ví',
          tabBarIcon: ({ color }) => (
            <TabBarIcon icon="account_balance_wallet" color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Ngân sách',
          tabBarIcon: ({ color }) => (
            <TabBarIcon icon="pie_chart" color={color} size={24} />
          ),
        }}
      />

      {/* Legacy tabs — hidden from tab bar, routes still accessible */}
      <Tabs.Screen name="report" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
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
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 4,
    borderColor: COLORS.background,
  },
});
