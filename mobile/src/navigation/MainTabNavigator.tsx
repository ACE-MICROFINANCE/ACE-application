import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '@screens/DashboardScreen';
import LoansScreen from '@screens/LoansScreen';
import SavingsScreen from '@screens/SavingsScreen';
import ScheduleScreen from '@screens/ScheduleScreen';
import InfoScreen from '@screens/InfoScreen';
import AccountScreen from '@screens/AccountScreen';
import { TabBar } from './TabBar';
import { useAuthStore } from '@store/authStore';

export type MainTabParamList = {
  Dashboard: undefined;
  Loans: undefined;
  Savings: undefined;
  Schedule: undefined;
  Info: undefined;
  Account: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  const { mustChangePassword } = useAuthStore();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: mustChangePassword ? 'none' : 'flex' },
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Loans" component={LoansScreen} />
      <Tab.Screen name="Savings" component={SavingsScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Info" component={InfoScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
};
