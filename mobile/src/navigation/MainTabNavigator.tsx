import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '@screens/DashboardScreen';
import LoansScreen from '@screens/LoansScreen';
import SavingsScreen from '@screens/SavingsScreen';
import ScheduleScreen from '@screens/ScheduleScreen';
import InfoScreen from '@screens/InfoScreen';
import AccountScreen from '@screens/AccountScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  Loans: undefined;
  Savings: undefined;
  Schedule: undefined;
  Info: undefined;
  Account: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const iconMap: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'home-outline',
  Loans: 'cash-outline',
  Savings: 'wallet-outline',
  Schedule: 'calendar-outline',
  Info: 'information-circle-outline',
  Account: 'person-circle-outline',
};

export const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ color, size }) => {
        const iconName = iconMap[route.name as keyof MainTabParamList];
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#1f7a8c',
      tabBarInactiveTintColor: '#94a3b8',
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Loans" component={LoansScreen} />
    <Tab.Screen name="Savings" component={SavingsScreen} />
    <Tab.Screen name="Schedule" component={ScheduleScreen} />
    <Tab.Screen name="Info" component={InfoScreen} />
    <Tab.Screen name="Account" component={AccountScreen} />
  </Tab.Navigator>
);
