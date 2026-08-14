import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import TabBarIcon from '@/components/common/TabBarIcon';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';

function EntryTabButton({ onPress }: BottomTabBarButtonProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.entryWrapper}
      accessibilityLabel="Thêm giao dịch"
    >
      <View style={styles.entryButton}>
        <MaterialIcon name="add" color={colors.onPrimary} size={28} />
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: `${colors.surfaceContainer}E6`,
          borderTopColor: `${colors.outlineVariant}66`,
          height: 64 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
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
          popToTopOnBlur: true,
          tabBarIcon: ({ color }) => (
            <TabBarIcon icon="pie_chart" color={color} size={24} />
          ),
        }}
      />

    </Tabs>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    entryWrapper: {
      top: -20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    entryButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
      borderWidth: 4,
      borderColor: colors.background,
    },
  });
}
