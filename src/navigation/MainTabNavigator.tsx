import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import TabBarIcon from '@/components/common/TabBarIcon';
import { COLORS } from '@/constants/theme';

import ReportStack  from './ReportStack';
import CalendarStack from './CalendarStack';
import EntryStack   from './EntryStack';
import WalletStack  from './WalletStack';
import MoreStack    from './MoreStack';

export type MainTabParamList = {
  ReportTab:   undefined;
  CalendarTab: undefined;
  EntryTab:    undefined;
  WalletTab:   undefined;
  MoreTab:     undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// Raised floating Entry button
function EntryTabButton({ onPress }: BottomTabBarButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.entryButtonWrapper}
    >
      <View style={styles.entryButton}>
        <TabBarIcon glyph="+" color={COLORS.white} size={28} />
      </View>
    </TouchableOpacity>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
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
      <Tab.Screen
        name="ReportTab"
        component={ReportStack}
        options={{
          title: 'Báo cáo',
          tabBarIcon: ({ color, size }) => <TabBarIcon glyph="📊" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarStack}
        options={{
          title: 'Lịch',
          tabBarIcon: ({ color, size }) => <TabBarIcon glyph="📅" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="EntryTab"
        component={EntryStack}
        options={{
          title: '',
          tabBarButton: (props) => <EntryTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name="WalletTab"
        component={WalletStack}
        options={{
          title: 'Ví',
          tabBarIcon: ({ color, size }) => <TabBarIcon glyph="💳" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreStack}
        options={{
          title: 'Khác',
          tabBarIcon: ({ color, size }) => <TabBarIcon glyph="☰" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  entryButtonWrapper: {
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
